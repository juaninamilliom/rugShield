import { PrismaClient } from '../../src/generated/prisma';
import { PrismaScanRepository } from '../../src/core/repository';

const describeDb = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip;

describeDb('PrismaScanRepository (db)', () => {
  const prisma = new PrismaClient();
  const repo = new PrismaScanRepository(prisma);

  beforeAll(async () => {
    await prisma.apiKeyUsage.deleteMany({});
    await prisma.apiKey.deleteMany({});
    await prisma.scan.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists and retrieves a scan record', async () => {
    const created = await repo.create({
      chain: 'sui',
      targetType: 'address',
      targetValue: '0x'.padEnd(66, 'c'),
      score: 77,
      riskLevel: 'low',
      summary: 'Test summary',
      findings: [],
      aiModel: 'deterministic-rules-v1',
      analysisTimeMs: 22,
      sourceCodeHash: 'abc123',
    });

    const fetched = await repo.getById(created.id);
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.chain).toBe('sui');

    const listed = await repo.list({ chain: 'sui', limit: 10 });
    expect(listed.length).toBeGreaterThanOrEqual(1);
  });

  it('creates api key, authenticates by hash, and records usage', async () => {
    const key = await repo.createApiKey({
      name: 'db-key',
      tier: 'api',
      keyHash: 'hash-123',
      keyPrefix: 'rgs_api_123456',
    });

    const auth = await repo.findActiveApiKeyByHash('hash-123');
    expect(auth?.id).toBe(key.id);

    await repo.recordApiUsage({
      apiKeyId: key.id,
      endpoint: '/api/v1/analyze',
      chain: 'sui',
      requestUnits: 2,
    });

    const count = await repo.countApiUsageSince({
      apiKeyId: key.id,
      since: new Date(Date.now() - 60 * 1000),
    });
    expect(count).toBe(2);

    const rows = await repo.listUsageRows({
      start: new Date(Date.now() - 60 * 1000),
      end: new Date(Date.now() + 60 * 1000),
      tier: 'api',
    });
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].tier).toBe('api');
  });
});
