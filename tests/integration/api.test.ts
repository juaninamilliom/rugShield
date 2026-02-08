import request from 'supertest';
import express from 'express';
import { createApp } from '../../src/api/app';
import { RugShieldService } from '../../src/core/service';
import {
  AccessRepository,
  ApiKeyRecord,
  ScanRepository,
  StoredScan,
  UsageSummaryRow,
} from '../../src/core/types';

const describeHttp =
  process.env.ALLOW_HTTP_TESTS === '1' ? describe : describe.skip;

class InMemoryRepo implements ScanRepository, AccessRepository {
  private scans: StoredScan[] = [];
  private keys: Array<ApiKeyRecord & { keyHash: string }> = [];
  private usageRows: UsageSummaryRow[] = [];

  async create(data: Omit<StoredScan, 'id' | 'createdAt'>): Promise<StoredScan> {
    const row: StoredScan = { id: `scan_${this.scans.length + 1}`, createdAt: new Date(), ...data };
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

describeHttp('api', () => {
  let app: express.Express;

  beforeEach(() => {
    process.env.INTERNAL_ADMIN_TOKEN = 'admin-secret';
    process.env.FREE_TIER_DAILY_LIMIT = '1';
    const repo = new InMemoryRepo();
    app = createApp(new RugShieldService(repo, repo));
  });

  it('returns health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('creates admin api key and supports self-service key endpoints', async () => {
    const keyRes = await request(app)
      .post('/api/v1/admin/keys')
      .set('x-admin-token', 'admin-secret')
      .send({ name: 'ops-key', tier: 'api' });

    expect(keyRes.status).toBe(201);
    const token = keyRes.body.apiKey.token;

    const statusRes = await request(app)
      .get('/api/v1/keys/me')
      .set('x-api-key', token);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status.key.tier).toBe('api');

    const rotateRes = await request(app)
      .post('/api/v1/keys/rotate')
      .set('x-api-key', token)
      .send({ name: 'ops-key-rotated' });

    expect(rotateRes.status).toBe(201);
    expect(rotateRes.body.apiKey.token).toBeDefined();

    const oldTokenRes = await request(app)
      .get('/api/v1/keys/me')
      .set('x-api-key', token);
    expect(oldTokenRes.status).toBe(401);
  });
});
