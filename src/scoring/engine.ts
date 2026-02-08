import crypto from 'crypto';
import { ChainAnalysisArtifact, RiskLevel, SecurityReport, TargetType, VulnerabilityFinding } from './types';
import { detectFindings } from './rules';

const SEVERITY_WEIGHTS: Record<VulnerabilityFinding['severity'], number> = {
  critical: 30,
  high: 18,
  medium: 10,
  low: 4,
  info: 1,
};

function toRiskLevel(score: number): RiskLevel {
  if (score >= 85) return 'safe';
  if (score >= 70) return 'low';
  if (score >= 50) return 'medium';
  if (score >= 30) return 'high';
  return 'critical';
}

function summarize(findings: VulnerabilityFinding[]): string {
  if (!findings.length) return 'No major deterministic risk patterns were detected.';
  const critical = findings.filter((f) => f.severity === 'critical').length;
  const high = findings.filter((f) => f.severity === 'high').length;
  return `Detected ${findings.length} finding(s), including ${critical} critical and ${high} high severity risks.`;
}

/**
 * Builds a stable source hash so repeat scans can be deduplicated and compared safely.
 */
export function hashSource(sourceCode: string): string {
  return crypto.createHash('sha256').update(sourceCode).digest('hex');
}

/**
 * Produces RugShield's normalized security report from chain artifact data.
 */
export function buildSecurityReport(params: {
  artifact: ChainAnalysisArtifact;
  targetType: TargetType;
  startedAt: number;
  aiModel?: string;
}): SecurityReport {
  const findings = detectFindings(params.artifact);
  const penalty = findings.reduce((acc, finding) => acc + SEVERITY_WEIGHTS[finding.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  return {
    chain: params.artifact.chain,
    targetType: params.targetType,
    targetValue: params.artifact.targetValue,
    score,
    riskLevel: toRiskLevel(score),
    summary: summarize(findings),
    findings,
    aiModel: params.aiModel || 'deterministic-rules-v1',
    analysisTimeMs: Date.now() - params.startedAt,
    createdAt: Date.now(),
  };
}
