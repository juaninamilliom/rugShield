import crypto from 'crypto';
import express from 'express';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '../generated/prisma';
import { PrismaScanRepository } from '../core/repository';
import { RugShieldService } from '../core/service';
import { ApiKeyTier } from '../core/types';
import { logError, logInfo } from '../utils/logger';

function parseApiKey(req: express.Request): string | undefined {
  const header = req.header('x-api-key');
  if (header) return header.trim();

  const auth = req.header('authorization');
  if (!auth) return undefined;
  const [scheme, value] = auth.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') return undefined;
  return value?.trim();
}

function isAdminRequest(req: express.Request): boolean {
  const expected = process.env.INTERNAL_ADMIN_TOKEN;
  if (!expected) return false;
  return req.header('x-admin-token') === expected;
}

function parseTier(value: unknown): ApiKeyTier | null {
  if (value === 'free' || value === 'pro' || value === 'api') return value;
  return null;
}

function parsePeriod(req: express.Request): { start: Date; end: Date } {
  const end = req.query.end ? new Date(String(req.query.end)) : new Date();
  const start = req.query.start
    ? new Date(String(req.query.start))
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    throw new Error('Invalid report period. Provide ISO dates with start < end.');
  }

  return { start, end };
}

function getRequestId(req: express.Request): string {
  return String(resquestIdFromReq(req) || crypto.randomUUID());
}

function resquestIdFromReq(req: express.Request): string | undefined {
  const header = req.header('x-request-id');
  return header?.trim() || undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function sendError(res: express.Response, status: number, requestId: string, error: unknown): void {
  res.status(status).json({ error: errorMessage(error), requestId });
}

export function createApp(service?: RugShieldService): express.Express {
  const app = express();
  const prisma = new PrismaClient();
  const repository = new PrismaScanRepository(prisma);
  const rugShieldService = service || new RugShieldService(repository, repository);
  const publicDir = path.resolve(process.cwd(), 'public');

  app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => {
    const requestId = getRequestId(req);
    res.locals.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    const startedAt = Date.now();
    res.on('finish', () => {
      logInfo('http_request', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });

    next();
  });

  app.use(
    '/api/',
    rateLimit({
      windowMs: 60 * 1000,
      max: Number(process.env.RATE_LIMIT_PER_MINUTE || 60),
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(express.static(publicDir));
  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'rugshield', time: new Date().toISOString() });
  });

  app.get('/ready', async (_req, res) => {
    const requestId = String(res.locals.requestId || crypto.randomUUID());
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ready', service: 'rugshield', requestId, time: new Date().toISOString() });
    } catch (error) {
      logError('readiness_check_failed', { requestId, error: errorMessage(error) });
      sendError(res, 503, requestId, 'Database connection unavailable.');
    }
  });

  app.get('/api/v1/meta', (_req, res) => {
    res.json({
      name: 'RugShield',
      chainPriority: ['sui', 'evm', 'solana'],
      defaultChain: 'sui',
      version: '0.5.0',
    });
  });

  app.post('/api/v1/analyze', async (req, res) => {
    const requestId = String(res.locals.requestId || crypto.randomUUID());

    try {
      const { chain, targetType = 'address', targetValue, sourceCode } = req.body || {};
      if (targetType !== 'address' && targetType !== 'source') {
        sendError(res, 400, requestId, 'targetType must be address or source.');
        return;
      }

      const rawApiKey = parseApiKey(req);
      const apiKey = rawApiKey ? await rugShieldService.authenticateApiKey(rawApiKey) : null;
      if (rawApiKey && !apiKey) {
        sendError(res, 401, requestId, 'Invalid or inactive API key.');
        return;
      }

      if (apiKey) {
        await rugShieldService.enforceDailyQuota(apiKey);
      }

      const scan = await rugShieldService.analyze({ chain, targetType, targetValue, sourceCode });
      if (apiKey) {
        await rugShieldService.recordApiUsage({
          apiKeyId: apiKey.id,
          endpoint: '/api/v1/analyze',
          chain: scan.chain,
        });
      }

      res.status(201).json({ scan, requestId });
    } catch (error) {
      const message = errorMessage(error);
      if (message.includes('Daily quota exceeded')) {
        sendError(res, 429, requestId, message);
        return;
      }

      logError('analyze_failed', { requestId, message });
      sendError(res, 400, requestId, message);
    }
  });

  app.get('/api/v1/keys/me', async (req, res) => {
    const requestId = String(res.locals.requestId || crypto.randomUUID());

    try {
      const apiKey = parseApiKey(req);
      if (!apiKey) {
        sendError(res, 401, requestId, 'API key required.');
        return;
      }

      const status = await rugShieldService.getApiKeyStatus(apiKey);
      res.json({ status, requestId });
    } catch (error) {
      sendError(res, 401, requestId, error);
    }
  });

  app.post('/api/v1/keys/rotate', async (req, res) => {
    const requestId = String(res.locals.requestId || crypto.randomUUID());

    try {
      const apiKey = parseApiKey(req);
      if (!apiKey) {
        sendError(res, 401, requestId, 'API key required.');
        return;
      }

      const next = await rugShieldService.rotateApiKey(
        apiKey,
        req.body?.name ? String(req.body.name) : undefined,
      );
      res.status(201).json({ apiKey: next, requestId });
    } catch (error) {
      sendError(res, 401, requestId, error);
    }
  });

  app.get('/api/v1/scans/:id', async (req, res) => {
    const requestId = String(res.locals.requestId || crypto.randomUUID());

    const scan = await rugShieldService.getScan(req.params.id);
    if (!scan) {
      sendError(res, 404, requestId, 'Scan not found.');
      return;
    }
    res.json({ scan, requestId });
  });

  app.get('/api/v1/scans', async (req, res) => {
    const requestId = String(res.locals.requestId || crypto.randomUUID());

    try {
      const chain = req.query.chain ? String(req.query.chain) : undefined;
      const targetValue = req.query.targetValue ? String(req.query.targetValue) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const scans = await rugShieldService.listScans({ chain, targetValue, limit });
      res.json({ scans, requestId });
    } catch (error) {
      sendError(res, 400, requestId, error);
    }
  });

  app.post('/api/v1/admin/keys', async (req, res) => {
    const requestId = String(res.locals.requestId || crypto.randomUUID());

    if (!isAdminRequest(req)) {
      sendError(res, 403, requestId, 'Forbidden.');
      return;
    }

    try {
      const tier = parseTier(req.body?.tier);
      if (!tier) {
        sendError(res, 400, requestId, 'tier must be one of: free, pro, api.');
        return;
      }

      const created = await rugShieldService.createApiKey({
        name: String(req.body?.name || ''),
        tier,
      });
      res.status(201).json({ apiKey: created, requestId });
    } catch (error) {
      sendError(res, 400, requestId, error);
    }
  });

  app.get('/api/v1/admin/keys', async (req, res) => {
    const requestId = String(res.locals.requestId || crypto.randomUUID());

    if (!isAdminRequest(req)) {
      sendError(res, 403, requestId, 'Forbidden.');
      return;
    }

    try {
      const keys = await rugShieldService.listApiKeys();
      res.json({ keys, requestId });
    } catch (error) {
      sendError(res, 400, requestId, error);
    }
  });

  app.delete('/api/v1/admin/keys/:id', async (req, res) => {
    const requestId = String(res.locals.requestId || crypto.randomUUID());

    if (!isAdminRequest(req)) {
      sendError(res, 403, requestId, 'Forbidden.');
      return;
    }

    try {
      const revoked = await rugShieldService.revokeApiKey(req.params.id);
      if (!revoked) {
        sendError(res, 404, requestId, 'API key not found or already revoked.');
        return;
      }
      res.status(204).send();
    } catch (error) {
      sendError(res, 400, requestId, error);
    }
  });

  app.get('/api/v1/admin/reports/usage', async (req, res) => {
    const requestId = String(res.locals.requestId || crypto.randomUUID());

    if (!isAdminRequest(req)) {
      sendError(res, 403, requestId, 'Forbidden.');
      return;
    }

    try {
      const period = parsePeriod(req);
      const rawTier = req.query.tier ? parseTier(String(req.query.tier)) : null;
      if (req.query.tier && !rawTier) {
        sendError(res, 400, requestId, 'tier must be one of: free, pro, api.');
        return;
      }
      const tier = rawTier || undefined;

      const report = await rugShieldService.getUsageSummary({ ...period, tier });
      res.json({ period, report, requestId });
    } catch (error) {
      sendError(res, 400, requestId, error);
    }
  });

  app.get('/api/v1/admin/reports/invoice', async (req, res) => {
    const requestId = String(res.locals.requestId || crypto.randomUUID());

    if (!isAdminRequest(req)) {
      sendError(res, 403, requestId, 'Forbidden.');
      return;
    }

    try {
      const period = parsePeriod(req);
      const invoice = await rugShieldService.getInvoiceReport(period);
      res.json({ invoice, requestId });
    } catch (error) {
      sendError(res, 400, requestId, error);
    }
  });

  return app;
}
