import express from 'express';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '../generated/prisma';
import { PrismaScanRepository } from '../core/repository';
import { RugShieldService } from '../core/service';
import { ApiKeyTier } from '../core/types';

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

export function createApp(service?: RugShieldService): express.Express {
  const app = express();
  const prisma = new PrismaClient();
  const repository = new PrismaScanRepository(prisma);
  const rugShieldService = service || new RugShieldService(repository, repository);

  app.use(express.json({ limit: '1mb' }));
  app.use(
    '/api/',
    rateLimit({
      windowMs: 60 * 1000,
      max: Number(process.env.RATE_LIMIT_PER_MINUTE || 60),
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'rugshield', time: new Date().toISOString() });
  });

  app.get('/api/v1/meta', (_req, res) => {
    res.json({
      name: 'RugShield',
      chainPriority: ['sui', 'evm', 'solana'],
      defaultChain: 'sui',
      version: '0.4.0',
    });
  });

  app.post('/api/v1/analyze', async (req, res) => {
    try {
      const { chain, targetType = 'address', targetValue, sourceCode } = req.body || {};
      if (targetType !== 'address' && targetType !== 'source') {
        res.status(400).json({ error: 'targetType must be address or source.' });
        return;
      }

      const rawApiKey = parseApiKey(req);
      const apiKey = rawApiKey ? await rugShieldService.authenticateApiKey(rawApiKey) : null;
      if (rawApiKey && !apiKey) {
        res.status(401).json({ error: 'Invalid or inactive API key.' });
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

      res.status(201).json({ scan });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Daily quota exceeded')) {
        res.status(429).json({ error: message });
        return;
      }
      res.status(400).json({ error: message });
    }
  });

  app.get('/api/v1/keys/me', async (req, res) => {
    try {
      const apiKey = parseApiKey(req);
      if (!apiKey) {
        res.status(401).json({ error: 'API key required.' });
        return;
      }

      const status = await rugShieldService.getApiKeyStatus(apiKey);
      res.json({ status });
    } catch (error) {
      res.status(401).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/api/v1/keys/rotate', async (req, res) => {
    try {
      const apiKey = parseApiKey(req);
      if (!apiKey) {
        res.status(401).json({ error: 'API key required.' });
        return;
      }

      const next = await rugShieldService.rotateApiKey(apiKey, req.body?.name ? String(req.body.name) : undefined);
      res.status(201).json({ apiKey: next });
    } catch (error) {
      res.status(401).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get('/api/v1/scans/:id', async (req, res) => {
    const scan = await rugShieldService.getScan(req.params.id);
    if (!scan) {
      res.status(404).json({ error: 'Scan not found.' });
      return;
    }
    res.json({ scan });
  });

  app.get('/api/v1/scans', async (req, res) => {
    try {
      const chain = req.query.chain ? String(req.query.chain) : undefined;
      const targetValue = req.query.targetValue ? String(req.query.targetValue) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const scans = await rugShieldService.listScans({ chain, targetValue, limit });
      res.json({ scans });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post('/api/v1/admin/keys', async (req, res) => {
    if (!isAdminRequest(req)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }

    try {
      const tier = parseTier(req.body?.tier);
      if (!tier) {
        res.status(400).json({ error: 'tier must be one of: free, pro, api.' });
        return;
      }

      const created = await rugShieldService.createApiKey({
        name: String(req.body?.name || ''),
        tier,
      });
      res.status(201).json({ apiKey: created });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get('/api/v1/admin/keys', async (req, res) => {
    if (!isAdminRequest(req)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }

    try {
      const keys = await rugShieldService.listApiKeys();
      res.json({ keys });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.delete('/api/v1/admin/keys/:id', async (req, res) => {
    if (!isAdminRequest(req)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }

    try {
      const revoked = await rugShieldService.revokeApiKey(req.params.id);
      if (!revoked) {
        res.status(404).json({ error: 'API key not found or already revoked.' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get('/api/v1/admin/reports/usage', async (req, res) => {
    if (!isAdminRequest(req)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }

    try {
      const period = parsePeriod(req);
      const rawTier = req.query.tier ? parseTier(String(req.query.tier)) : null;
      if (req.query.tier && !rawTier) {
        res.status(400).json({ error: 'tier must be one of: free, pro, api.' });
        return;
      }
      const tier = rawTier || undefined;

      const report = await rugShieldService.getUsageSummary({ ...period, tier });
      res.json({ period, report });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get('/api/v1/admin/reports/invoice', async (req, res) => {
    if (!isAdminRequest(req)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }

    try {
      const period = parsePeriod(req);
      const invoice = await rugShieldService.getInvoiceReport(period);
      res.json({ invoice });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  return app;
}
