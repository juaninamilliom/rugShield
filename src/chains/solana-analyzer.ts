import { ChainAnalysisArtifact } from '../scoring/types';
import { providerRetryOptionsFromEnv, providerTimeoutMsFromEnv, withRetry } from '../utils/retry';
import { ChainAnalyzer } from './provider';

const DEFAULT_SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export class SolanaAnalyzer implements ChainAnalyzer {
  readonly chain = 'solana' as const;

  normalizeTarget(target: string): string {
    return target.trim();
  }

  isValidTarget(target: string): boolean {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(this.normalizeTarget(target));
  }

  async fetchArtifact(target: string): Promise<ChainAnalysisArtifact> {
    const normalized = this.normalizeTarget(target);
    const retry = providerRetryOptionsFromEnv();
    const timeoutMs = providerTimeoutMsFromEnv();

    let providerHealthy = true;
    let degradedModeReason: string | undefined;

    try {
      await withRetry(
        async () => {
          const response = await fetch(DEFAULT_SOLANA_RPC, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth', params: [] }),
            signal: AbortSignal.timeout(timeoutMs),
          });

          if (!response.ok) {
            throw new Error(`Solana RPC status ${response.status}`);
          }
        },
        retry,
      );
    } catch (error) {
      providerHealthy = false;
      degradedModeReason = error instanceof Error ? error.message : 'Solana RPC unavailable';
    }

    // Solana programs are not Move contracts. Use SVM program model.
    const sourceCode = [
      `// Solana program: ${normalized}`,
      '/* Program source retrieval requires explorer/indexer metadata and is chain-specific. */',
      'pub fn process_instruction() {}',
    ].join('\n');

    return {
      chain: 'solana',
      targetValue: target,
      normalizedTarget: normalized,
      sourceCode,
      metadata: {
        compiler: 'rust/svm',
        verifiedSource: false,
        fetchedAt: Date.now(),
        providerHealthy,
        degradedModeReason,
        retryAttempts: retry.attempts,
      },
    };
  }
}
