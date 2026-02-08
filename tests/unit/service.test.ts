import { RugShieldService } from '../../src/core/service';
import {
  AccessRepository,
  ApiKeyRecord,
  ScanRepository,
  StoredScan,
  UsageSummaryRow,
} from '../../src/core/types';

class InMemoryRepo implements ScanRepository, AccessRepository {
  private scans: StoredScan[] = [];
  private keys: Array<ApiKeyRecord & { keyHash: string }> = [];
  private usageRows: UsageSummaryRow[] = [];

  async create(data: Omit<StoredScan, 'id' | 'createdAt'>): Promise<StoredScan> {
    const row: StoredScan = {
      id: `scan_${this.scans.length + 1}`,
      createdAt: new Date(),
      ...data,
    };
    this.scans.unshift(row);
    return row;
  }

  async getById(id: string): Promise<StoredScan | null> {
    return this.scans.find((scan) => scan.id === id) || null;
  }

  async list(): Promise<StoredScan[]> {
    return this.scans;
  }

  async createApiKey(data: {
    name: string;
    tier: 'free' | 'pro' | 'api';
    keyHash: string;
    keyPrefix: string;
  }): Promise<ApiKeyRecord> {
    const row = {
      id: `key_${this.keys.length + 1}`,
      name: data.name,
      tier: data.tier,
      keyHash: data.keyHash,
      keyPrefix: data.keyPrefix,
      active: true,
      usageCount: 0,
      createdAt: new Date(),
      lastUsedAt: undefined,
    };
    this.keys.unshift(row);
    return row;
  }

  async findActiveApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | null> {
    const row = this.keys.find((key) => key.active && key.keyHash === keyHash);
    return row || null;
  }

  async listApiKeys(): Promise<ApiKeyRecord[]> {
    return this.keys;
  }

  async revokeApiKey(id: string): Promise<boolean> {
    const row = this.keys.find((key) => key.id === id && key.active);
    if (!row) return false;
    row.active = false;
    return true;
  }

  async recordApiUsage(data: {
    apiKeyId: string;
    endpoint: string;
    chain?: 'sui' | 'evm' | 'solana';
    requestUnits?: number;
  }): Promise<void> {
    const row = this.keys.find((key) => key.id === data.apiKeyId);
    if (!row) return;
    const units = data.requestUnits || 1;
    row.usageCount += units;
    row.lastUsedAt = new Date();

    this.usageRows.push({
      apiKeyId: row.id,
      keyName: row.name,
      keyPrefix: row.keyPrefix,
      tier: row.tier,
      endpoint: data.endpoint,
      chain: data.chain,
      requestUnits: units,
      createdAt: new Date(),
    });
  }

  async countApiUsageSince(params: { apiKeyId: string; since: Date }): Promise<number> {
    return this.usageRows
      .filter((row) => row.apiKeyId === params.apiKeyId && row.createdAt >= params.since)
      .reduce((sum, row) => sum + row.requestUnits, 0);
  }

  async listUsageRows(params: {
    start: Date;
    end: Date;
    tier?: 'free' | 'pro' | 'api';
  }): Promise<UsageSummaryRow[]> {
    return this.usageRows.filter((row) => {
      if (row.createdAt < params.start || row.createdAt >= params.end) return false;
      if (params.tier && row.tier !== params.tier) return false;
      return true;
    });
  }
}

describe('RugShieldService', () => {
  it('analyzes SUI target by default and stores scan', async () => {
    const repo = new InMemoryRepo();
    const service = new RugShieldService(repo, repo);
    const result = await service.analyze({
      targetType: 'address',
      targetValue: '0x'.padEnd(66, 'b'),
    });

    expect(result.id).toBeDefined();
    expect(result.chain).toBe('sui');
    expect(result.sourceCodeHash).toBeDefined();
  });

  it('rejects invalid target format', async () => {
    const repo = new InMemoryRepo();
    const service = new RugShieldService(repo, repo);
    await expect(
      service.analyze({
        chain: 'evm',
        targetType: 'address',
        targetValue: 'not-address',
      }),
    ).rejects.toThrow('Invalid evm target format.');
  });

  it('creates and authenticates api keys', async () => {
    const repo = new InMemoryRepo();
    const service = new RugShieldService(repo, repo);

    const created = await service.createApiKey({ name: 'test-key', tier: 'api' });
    expect(created.token.startsWith('rgs_api_')).toBe(true);

    const auth = await service.authenticateApiKey(created.token);
    expect(auth?.id).toBe(created.id);
  });

  it('rotates key and invalidates old token', async () => {
    const repo = new InMemoryRepo();
    const service = new RugShieldService(repo, repo);

    const first = await service.createApiKey({ name: 'rotate-me', tier: 'api' });
    const second = await service.rotateApiKey(first.token, 'rotate-me-2');

    expect(second.token).not.toBe(first.token);
    expect((await service.authenticateApiKey(first.token)) === null).toBe(true);
    expect((await service.authenticateApiKey(second.token))?.name).toBe('rotate-me-2');
  });

  it('enforces free-tier daily quota', async () => {
    process.env.FREE_TIER_DAILY_LIMIT = '2';
    const repo = new InMemoryRepo();
    const service = new RugShieldService(repo, repo);

    const created = await service.createApiKey({ name: 'free-key', tier: 'free' });
    const auth = await service.authenticateApiKey(created.token);
    if (!auth) throw new Error('auth required');

    await service.recordApiUsage({ apiKeyId: auth.id, endpoint: '/api/v1/analyze' });
    await service.recordApiUsage({ apiKeyId: auth.id, endpoint: '/api/v1/analyze' });

    await expect(service.enforceDailyQuota(auth)).rejects.toThrow('Daily quota exceeded');
  });

  it('builds invoice report for api-tier usage', async () => {
    process.env.API_SCAN_UNIT_PRICE_USD = '0.05';
    const repo = new InMemoryRepo();
    const service = new RugShieldService(repo, repo);

    const created = await service.createApiKey({ name: 'billable', tier: 'api' });
    const auth = await service.authenticateApiKey(created.token);
    if (!auth) throw new Error('auth required');

    await service.recordApiUsage({ apiKeyId: auth.id, endpoint: '/api/v1/analyze', requestUnits: 3 });

    const now = new Date();
    const invoice = await service.getInvoiceReport({
      start: new Date(now.getTime() - 60_000),
      end: new Date(now.getTime() + 60_000),
    });

    expect(invoice.totalAmountUsd).toBe(0.15);
    expect(invoice.lineItems).toHaveLength(1);
    expect(invoice.lineItems[0].billableUnits).toBe(3);
  });
});
