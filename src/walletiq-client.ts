import { ChainId } from './scoring/types';

interface WalletReputationScore {
  wallet: string;
  chain: ChainId;
  score: number;
  tier: 'trusted' | 'balanced' | 'cautious' | 'risky';
  factors: string[];
}

/**
 * Placeholder WalletIQ client for RugShield.
 * Calls the WalletIQ API to check deployer wallet reputation
 * as part of contract security analysis.
 */
export class WalletIqClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey?: string
  ) {}

  async fetchDeployerReputation(wallet: string, chain: ChainId): Promise<WalletReputationScore | null> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/api/v1/reputation/${encodeURIComponent(wallet)}?chain=${chain}`;

    try {
      const response = await fetch(url, {
        headers: this.apiKey ? { 'x-api-key': this.apiKey } : undefined,
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return null;
      }

      const body = (await response.json()) as {
        data?: {
          overallScore?: number;
          tier?: string;
          wallet?: string;
          chain?: string;
        };
      };

      const score = Number(body.data?.overallScore);
      if (!Number.isFinite(score)) {
        return null;
      }

      return {
        wallet,
        chain,
        score,
        tier: (body.data?.tier as WalletReputationScore['tier']) ?? 'cautious',
        factors: [`WalletIQ deployer score: ${score}`],
      };
    } catch (error) {
      console.warn('WalletIQ deployer reputation lookup failed:', error);
      return null;
    }
  }
}
