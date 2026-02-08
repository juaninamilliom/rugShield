import { ChainId, SecurityReport, TargetType } from '../scoring/types';

export type ApiKeyTier = 'free' | 'pro' | 'api';

export interface AnalyzeRequest {
  chain?: ChainId;
  targetType: TargetType;
  targetValue: string;
  sourceCode?: string;
}

export interface StoredScan {
  id: string;
  chain: ChainId;
  targetType: TargetType;
  targetValue: string;
  score: number;
  riskLevel: SecurityReport['riskLevel'];
  summary: string;
  findings: SecurityReport['findings'];
  aiModel: string;
  analysisTimeMs: number;
  sourceCodeHash?: string;
  createdAt: Date;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  tier: ApiKeyTier;
  keyPrefix: string;
  active: boolean;
  usageCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
}

export interface CreateApiKeyInput {
  name: string;
  tier: ApiKeyTier;
}

export interface CreatedApiKey extends ApiKeyRecord {
  token: string;
}

export interface UsageSummaryRow {
  apiKeyId: string;
  keyName: string;
  keyPrefix: string;
  tier: ApiKeyTier;
  endpoint: string;
  chain?: ChainId;
  requestUnits: number;
  createdAt: Date;
}

export interface UsageAggregate {
  apiKeyId: string;
  keyName: string;
  keyPrefix: string;
  tier: ApiKeyTier;
  totalUnits: number;
}

export interface InvoiceLineItem {
  apiKeyId: string;
  keyName: string;
  keyPrefix: string;
  tier: ApiKeyTier;
  billableUnits: number;
  unitPriceUsd: number;
  amountUsd: number;
}

export interface InvoiceReport {
  currency: 'USD';
  periodStart: Date;
  periodEnd: Date;
  totalAmountUsd: number;
  lineItems: InvoiceLineItem[];
}

export interface ScanRepository {
  create(data: Omit<StoredScan, 'id' | 'createdAt'>): Promise<StoredScan>;
  getById(id: string): Promise<StoredScan | null>;
  list(params: { chain?: ChainId; targetValue?: string; limit?: number }): Promise<StoredScan[]>;
}

export interface AccessRepository {
  createApiKey(data: { name: string; tier: ApiKeyTier; keyHash: string; keyPrefix: string }): Promise<ApiKeyRecord>;
  findActiveApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | null>;
  listApiKeys(limit?: number): Promise<ApiKeyRecord[]>;
  revokeApiKey(id: string): Promise<boolean>;
  recordApiUsage(data: { apiKeyId: string; endpoint: string; chain?: ChainId; requestUnits?: number }): Promise<void>;
  countApiUsageSince(params: { apiKeyId: string; since: Date }): Promise<number>;
  listUsageRows(params: { start: Date; end: Date; tier?: ApiKeyTier }): Promise<UsageSummaryRow[]>;
}
