import { PrismaClient } from '../generated/prisma';
import { ChainId } from '../scoring/types';
import {
  AccessRepository,
  ApiKeyRecord,
  ApiKeyTier,
  ScanRepository,
  StoredScan,
  UsageSummaryRow,
} from './types';

function mapScan(row: {
  id: string;
  chain: string;
  targetType: string;
  targetValue: string;
  score: number;
  riskLevel: string;
  summary: string;
  findingsJson: string;
  aiModel: string;
  analysisTimeMs: number;
  sourceCodeHash: string | null;
  createdAt: Date;
}): StoredScan {
  return {
    id: row.id,
    chain: row.chain as ChainId,
    targetType: row.targetType as StoredScan['targetType'],
    targetValue: row.targetValue,
    score: row.score,
    riskLevel: row.riskLevel as StoredScan['riskLevel'],
    summary: row.summary,
    findings: JSON.parse(row.findingsJson),
    aiModel: row.aiModel,
    analysisTimeMs: row.analysisTimeMs,
    sourceCodeHash: row.sourceCodeHash || undefined,
    createdAt: row.createdAt,
  };
}

function mapApiKey(row: {
  id: string;
  name: string;
  tier: string;
  keyPrefix: string;
  active: boolean;
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}): ApiKeyRecord {
  return {
    id: row.id,
    name: row.name,
    tier: row.tier as ApiKeyTier,
    keyPrefix: row.keyPrefix,
    active: row.active,
    usageCount: row.usageCount,
    lastUsedAt: row.lastUsedAt || undefined,
    createdAt: row.createdAt,
  };
}

/**
 * Prisma-backed repository for RugShield scans and API access management.
 */
export class PrismaScanRepository implements ScanRepository, AccessRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Omit<StoredScan, 'id' | 'createdAt'>): Promise<StoredScan> {
    const row = await this.prisma.scan.create({
      data: {
        chain: data.chain,
        targetType: data.targetType,
        targetValue: data.targetValue,
        score: data.score,
        riskLevel: data.riskLevel,
        summary: data.summary,
        findingsJson: JSON.stringify(data.findings),
        aiModel: data.aiModel,
        analysisTimeMs: data.analysisTimeMs,
        sourceCodeHash: data.sourceCodeHash || null,
      },
    });

    return mapScan(row);
  }

  async getById(id: string): Promise<StoredScan | null> {
    const row = await this.prisma.scan.findUnique({ where: { id } });
    return row ? mapScan(row) : null;
  }

  async list(params: { chain?: ChainId; targetValue?: string; limit?: number }): Promise<StoredScan[]> {
    const rows = await this.prisma.scan.findMany({
      where: {
        chain: params.chain,
        targetValue: params.targetValue,
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit || 20,
    });

    return rows.map(mapScan);
  }

  async createApiKey(data: {
    name: string;
    tier: ApiKeyTier;
    keyHash: string;
    keyPrefix: string;
  }): Promise<ApiKeyRecord> {
    const row = await this.prisma.apiKey.create({
      data: {
        name: data.name,
        tier: data.tier,
        keyHash: data.keyHash,
        keyPrefix: data.keyPrefix,
      },
    });

    return mapApiKey(row);
  }

  async findActiveApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | null> {
    const row = await this.prisma.apiKey.findFirst({
      where: {
        keyHash,
        active: true,
      },
    });

    return row ? mapApiKey(row) : null;
  }

  async listApiKeys(limit = 100): Promise<ApiKeyRecord[]> {
    const rows = await this.prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rows.map(mapApiKey);
  }

  async revokeApiKey(id: string): Promise<boolean> {
    const row = await this.prisma.apiKey.updateMany({
      where: { id, active: true },
      data: { active: false },
    });

    return row.count > 0;
  }

  async recordApiUsage(data: {
    apiKeyId: string;
    endpoint: string;
    chain?: ChainId;
    requestUnits?: number;
  }): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.apiKeyUsage.create({
        data: {
          apiKeyId: data.apiKeyId,
          endpoint: data.endpoint,
          chain: data.chain,
          requestUnits: data.requestUnits || 1,
        },
      }),
      this.prisma.apiKey.update({
        where: { id: data.apiKeyId },
        data: {
          usageCount: { increment: data.requestUnits || 1 },
          lastUsedAt: new Date(),
        },
      }),
    ]);
  }

  async countApiUsageSince(params: { apiKeyId: string; since: Date }): Promise<number> {
    const aggregate = await this.prisma.apiKeyUsage.aggregate({
      where: {
        apiKeyId: params.apiKeyId,
        createdAt: { gte: params.since },
      },
      _sum: { requestUnits: true },
    });

    return aggregate._sum.requestUnits || 0;
  }

  async listUsageRows(params: { start: Date; end: Date; tier?: ApiKeyTier }): Promise<UsageSummaryRow[]> {
    const rows = await this.prisma.apiKeyUsage.findMany({
      where: {
        createdAt: {
          gte: params.start,
          lt: params.end,
        },
        apiKey: params.tier ? { tier: params.tier } : undefined,
      },
      include: {
        apiKey: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => ({
      apiKeyId: row.apiKeyId,
      keyName: row.apiKey.name,
      keyPrefix: row.apiKey.keyPrefix,
      tier: row.apiKey.tier as ApiKeyTier,
      endpoint: row.endpoint,
      chain: (row.chain as ChainId | null) || undefined,
      requestUnits: row.requestUnits,
      createdAt: row.createdAt,
    }));
  }
}
