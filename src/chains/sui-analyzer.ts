import { ChainAnalysisArtifact } from '../scoring/types';
import { providerRetryOptionsFromEnv, providerTimeoutMsFromEnv, withRetry } from '../utils/retry';
import { ChainAnalyzer } from './provider';

const DEFAULT_SUI_RPC = process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443';

export class SuiAnalyzer implements ChainAnalyzer {
  readonly chain = 'sui' as const;

  normalizeTarget(target: string): string {
    const lower = target.trim().toLowerCase();
    return lower.startsWith('0x') ? lower : `0x${lower}`;
  }

  isValidTarget(target: string): boolean {
    return /^0x[0-9a-f]{64}$/i.test(this.normalizeTarget(target));
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
          const response = await fetch(DEFAULT_SUI_RPC, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'rpc.discover', params: [] }),
            signal: AbortSignal.timeout(timeoutMs),
          });

          if (!response.ok) {
            throw new Error(`Sui RPC status ${response.status}`);
          }
        },
        retry,
      );
    } catch (error) {
      providerHealthy = false;
      degradedModeReason = error instanceof Error ? error.message : 'Sui RPC unavailable';
    }

    const sourceCode = [
      `// SUI package: ${normalized}`,
      'module rugshield::sample {',
      '  public fun transfer_guard() {}',
      '}',
    ].join('\n');

    return {
      chain: 'sui',
      targetValue: target,
      normalizedTarget: normalized,
      sourceCode,
      metadata: {
        compiler: 'sui-move',
        verifiedSource: false,
        fetchedAt: Date.now(),
        providerHealthy,
        degradedModeReason,
        retryAttempts: retry.attempts,
      },
    };
  }
}
