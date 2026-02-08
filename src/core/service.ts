import crypto from 'crypto';
import { getAnalyzer, parseChain } from '../chains';
import { buildSecurityReport, hashSource } from '../scoring/engine';
import { ChainId } from '../scoring/types';
import {
  AccessRepository,
  AnalyzeRequest,
  ApiKeyRecord,
  ApiKeyTier,
  CreatedApiKey,
  CreateApiKeyInput,
  InvoiceReport,
  ScanRepository,
  StoredScan,
  UsageAggregate,
} from './types';

function detectChainFromTarget(target: string): ChainId {
  const value = target.trim();
  if (/^0x[0-9a-f]{64}$/i.test(value)) return 'sui';
  if (/^0x[0-9a-f]{40}$/i.test(value)) return 'evm';
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return 'solana';
  return 'sui';
}

function hashApiToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function randomToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

function startOfUtcDay(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Coordinates chain retrieval, security scoring, persistence, and API access control.
 */
export class RugShieldService {
  constructor(
    private readonly scanRepository: ScanRepository,
    private readonly accessRepository?: AccessRepository,
  ) {}

  private async createApiKeyRecord(input: CreateApiKeyInput): Promise<CreatedApiKey> {
    if (!this.accessRepository) {
      throw new Error('Access management is not configured.');
    }

    if (!input.name?.trim()) {
      throw new Error('API key name is required.');
    }

    if (!['free', 'pro', 'api'].includes(input.tier)) {
      throw new Error('API key tier must be free, pro, or api.');
    }

    const token = `rgs_${input.tier}_${randomToken()}`;
    const keyHash = hashApiToken(token);
    const keyPrefix = token.slice(0, 16);
    const created = await this.accessRepository.createApiKey({
      name: input.name.trim(),
      tier: input.tier,
      keyHash,
      keyPrefix,
    });

    return { ...created, token };
  }

  async analyze(input: AnalyzeRequest): Promise<StoredScan> {
    if (!input.targetValue?.trim()) {
      throw new Error('targetValue is required.');
    }

    const chain = input.chain || detectChainFromTarget(input.targetValue);
    const parsedChain = parseChain(chain);
    const analyzer = getAnalyzer(parsedChain);

    if (!analyzer.isValidTarget(input.targetValue)) {
      throw new Error(`Invalid ${parsedChain} target format.`);
    }

    const startedAt = Date.now();
    const artifact = await analyzer.fetchArtifact(input.targetValue);

    if (input.sourceCode?.trim()) {
      artifact.sourceCode = input.sourceCode;
    }

    const report = buildSecurityReport({
      artifact,
      targetType: input.targetType,
      startedAt,
    });

    return this.scanRepository.create({
      chain: report.chain,
      targetType: report.targetType,
      targetValue: report.targetValue,
      score: report.score,
      riskLevel: report.riskLevel,
      summary: report.summary,
      findings: report.findings,
      aiModel: report.aiModel,
      analysisTimeMs: report.analysisTimeMs,
      sourceCodeHash: hashSource(artifact.sourceCode),
    });
  }

  async getScan(id: string): Promise<StoredScan | null> {
    return this.scanRepository.getById(id);
  }

  async listScans(params: { chain?: string; targetValue?: string; limit?: number }): Promise<StoredScan[]> {
    return this.scanRepository.list({
      chain: params.chain ? parseChain(params.chain) : undefined,
      targetValue: params.targetValue,
      limit: params.limit,
    });
  }

  async createApiKey(input: CreateApiKeyInput): Promise<CreatedApiKey> {
    return this.createApiKeyRecord(input);
  }

  async authenticateApiKey(token: string): Promise<ApiKeyRecord | null> {
    if (!this.accessRepository) {
      return null;
    }

    if (!token?.trim()) {
      return null;
    }

    return this.accessRepository.findActiveApiKeyByHash(hashApiToken(token.trim()));
  }

  async rotateApiKey(currentToken: string, nextName?: string): Promise<CreatedApiKey> {
    const current = await this.authenticateApiKey(currentToken);
    if (!current) {
      throw new Error('Invalid or inactive API key.');
    }

    const replacement = await this.createApiKeyRecord({
      name: nextName?.trim() || `${current.name}-rotated`,
      tier: current.tier,
    });

    await this.revokeApiKey(current.id);
    return replacement;
  }

  async getApiKeyStatus(token: string): Promise<{
    key: ApiKeyRecord;
    quota: number;
    usedToday: number;
    remainingToday: number;
  }> {
    const key = await this.authenticateApiKey(token);
    if (!key) {
      throw new Error('Invalid or inactive API key.');
    }

    const quota = this.getAnalyzeQuotaByTier(key.tier);
    const usedToday = await this.getDailyUsageCount(key.id);
    return {
      key,
      quota,
      usedToday,
      remainingToday: Math.max(0, quota - usedToday),
    };
  }

  async listApiKeys(limit?: number): Promise<ApiKeyRecord[]> {
    if (!this.accessRepository) {
      throw new Error('Access management is not configured.');
    }

    return this.accessRepository.listApiKeys(limit);
  }

  async revokeApiKey(id: string): Promise<boolean> {
    if (!this.accessRepository) {
      throw new Error('Access management is not configured.');
    }

    return this.accessRepository.revokeApiKey(id);
  }

  async recordApiUsage(data: {
    apiKeyId: string;
    endpoint: string;
    chain?: ChainId;
    requestUnits?: number;
  }): Promise<void> {
    if (!this.accessRepository) {
      return;
    }

    await this.accessRepository.recordApiUsage(data);
  }

  getAnalyzeQuotaByTier(tier: ApiKeyTier): number {
    switch (tier) {
      case 'free':
        return Number(process.env.FREE_TIER_DAILY_LIMIT || 100);
      case 'pro':
        return Number(process.env.PRO_TIER_DAILY_LIMIT || 5000);
      case 'api':
        return Number(process.env.API_TIER_DAILY_LIMIT || 100000);
      default:
        return 0;
    }
  }

  async getDailyUsageCount(apiKeyId: string, now = new Date()): Promise<number> {
    if (!this.accessRepository) {
      return 0;
    }

    return this.accessRepository.countApiUsageSince({
      apiKeyId,
      since: startOfUtcDay(now),
    });
  }

  async enforceDailyQuota(apiKey: ApiKeyRecord, now = new Date()): Promise<void> {
    if (!this.accessRepository) {
      return;
    }

    const usedToday = await this.getDailyUsageCount(apiKey.id, now);
    const quota = this.getAnalyzeQuotaByTier(apiKey.tier);
    if (usedToday >= quota) {
      throw new Error(`Daily quota exceeded for tier '${apiKey.tier}' (${usedToday}/${quota}).`);
    }
  }

  async getUsageSummary(params: { start: Date; end: Date; tier?: ApiKeyTier }): Promise<UsageAggregate[]> {
    if (!this.accessRepository) {
      throw new Error('Access management is not configured.');
    }

    const rows = await this.accessRepository.listUsageRows(params);
    const map = new Map<string, UsageAggregate>();

    for (const row of rows) {
      const key = `${row.apiKeyId}:${row.endpoint}`;
      const existing = map.get(key);
      if (existing) {
        existing.totalUnits += row.requestUnits;
        continue;
      }

      map.set(key, {
        apiKeyId: row.apiKeyId,
        keyName: row.keyName,
        keyPrefix: row.keyPrefix,
        tier: row.tier,
        totalUnits: row.requestUnits,
      });
    }

    return Array.from(map.values()).sort((a, b) => b.totalUnits - a.totalUnits);
  }

  async getInvoiceReport(params: { start: Date; end: Date }): Promise<InvoiceReport> {
    const usage = await this.getUsageSummary(params);
    const unitPriceUsd = Number(process.env.API_SCAN_UNIT_PRICE_USD || 0.05);

    const lineItems = usage
      .filter((row) => row.tier === 'api')
      .map((row) => ({
        apiKeyId: row.apiKeyId,
        keyName: row.keyName,
        keyPrefix: row.keyPrefix,
        tier: row.tier,
        billableUnits: row.totalUnits,
        unitPriceUsd,
        amountUsd: Number((row.totalUnits * unitPriceUsd).toFixed(4)),
      }));

    const totalAmountUsd = Number(
      lineItems.reduce((sum, row) => sum + row.amountUsd, 0).toFixed(4),
    );

    return {
      currency: 'USD',
      periodStart: params.start,
      periodEnd: params.end,
      totalAmountUsd,
      lineItems,
    };
  }
}
