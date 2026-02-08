export type ChainId = 'sui' | 'evm' | 'solana';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';
export type TargetType = 'address' | 'source';

export interface VulnerabilityFinding {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  evidence?: string;
  recommendation: string;
  category: 'rug_pull_pattern' | 'access_control' | 'supply_control' | 'upgradeability' | 'unknown';
}

export interface AnalysisInput {
  chain: ChainId;
  targetType: TargetType;
  targetValue: string;
  sourceCode?: string;
}

export interface ChainAnalysisArtifact {
  chain: ChainId;
  targetValue: string;
  normalizedTarget: string;
  sourceCode: string;
  metadata: {
    compiler?: string;
    verifiedSource: boolean;
    fetchedAt: number;
    providerHealthy?: boolean;
    degradedModeReason?: string;
    retryAttempts?: number;
  };
}

export interface SecurityReport {
  chain: ChainId;
  targetType: TargetType;
  targetValue: string;
  score: number;
  riskLevel: RiskLevel;
  summary: string;
  findings: VulnerabilityFinding[];
  aiModel: string;
  analysisTimeMs: number;
  createdAt: number;
}
