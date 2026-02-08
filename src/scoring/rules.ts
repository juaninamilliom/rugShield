import { ChainAnalysisArtifact, Severity, VulnerabilityFinding } from './types';

interface RuleDefinition {
  id: string;
  title: string;
  severity: Severity;
  category: VulnerabilityFinding['category'];
  description: string;
  recommendation: string;
  patterns: RegExp[];
}

const CHAIN_RULES: Record<ChainAnalysisArtifact['chain'], RuleDefinition[]> = {
  sui: [
    {
      id: 'sui-public-mint',
      title: 'Public mint capability detected',
      severity: 'critical',
      category: 'supply_control',
      description: 'Public mint entry points may allow unbounded token supply changes.',
      recommendation: 'Restrict mint paths to controlled capability objects and policy checks.',
      patterns: [/public\s+fun\s+mint/gi, /treasurycap/gi],
    },
    {
      id: 'sui-admin-transfer',
      title: 'Privileged transfer control detected',
      severity: 'high',
      category: 'access_control',
      description: 'Admin-only transfer controls can freeze or censor user activity.',
      recommendation: 'Document governance model and enforce transparent authority transfers.',
      patterns: [/admin/gi, /freeze/gi, /denylist|blacklist/gi],
    },
  ],
  evm: [
    {
      id: 'evm-unlimited-mint',
      title: 'Unlimited mint pattern',
      severity: 'critical',
      category: 'supply_control',
      description: 'Mint function with weak checks can lead to inflation and rug behavior.',
      recommendation: 'Require role-based access and hard-cap constraints around minting.',
      patterns: [/function\s+mint/gi, /onlyowner/gi],
    },
    {
      id: 'evm-blacklist-gating',
      title: 'Transfer blacklist gating',
      severity: 'high',
      category: 'rug_pull_pattern',
      description: 'Blacklist-based transfer gating can trap users in a honeypot scenario.',
      recommendation: 'Remove discretionary transfer blacklisting or provide immutable controls.',
      patterns: [/blacklist/gi, /_transfer/gi],
    },
  ],
  solana: [
    {
      id: 'solana-upgrade-authority',
      title: 'Upgradeable program authority risk',
      severity: 'high',
      category: 'upgradeability',
      description: 'Retained upgrade authority allows post-deploy behavior changes.',
      recommendation: 'Lock or govern upgrade authority through audited multisig.',
      patterns: [/upgrade/gi, /authority/gi],
    },
    {
      id: 'solana-freeze-authority',
      title: 'Freeze authority controls',
      severity: 'medium',
      category: 'access_control',
      description: 'Token freeze authority can block transfers unexpectedly.',
      recommendation: 'Disclose freeze authority policy and constraints to users.',
      patterns: [/freeze/gi, /mint_authority|authority/gi],
    },
  ],
};

/**
 * Applies deterministic, chain-specific rules over fetched contract/program artifact text.
 */
export function detectFindings(artifact: ChainAnalysisArtifact): VulnerabilityFinding[] {
  const findings: VulnerabilityFinding[] = [];
  const source = artifact.sourceCode;

  for (const rule of CHAIN_RULES[artifact.chain]) {
    const matched = rule.patterns.some((pattern) => pattern.test(source));
    if (!matched) continue;

    findings.push({
      id: rule.id,
      title: rule.title,
      severity: rule.severity,
      category: rule.category,
      description: rule.description,
      recommendation: rule.recommendation,
      evidence: `Pattern hit in ${artifact.chain} artifact: ${rule.patterns[0].source}`,
    });
  }

  return findings;
}
