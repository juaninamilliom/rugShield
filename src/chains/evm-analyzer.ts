import axios from 'axios';
import { ethers } from 'ethers';
import { ChainAnalysisArtifact } from '../scoring/types';
import { providerRetryOptionsFromEnv, providerTimeoutMsFromEnv, withRetry } from '../utils/retry';
import { ChainAnalyzer } from './provider';

const ETHERSCAN_API = 'https://api.etherscan.io/api';

export class EvmAnalyzer implements ChainAnalyzer {
  readonly chain = 'evm' as const;

  normalizeTarget(target: string): string {
    return ethers.getAddress(target);
  }

  isValidTarget(target: string): boolean {
    try {
      ethers.getAddress(target);
      return true;
    } catch {
      return false;
    }
  }

  async fetchArtifact(target: string): Promise<ChainAnalysisArtifact> {
    const normalized = this.normalizeTarget(target);
    const retry = providerRetryOptionsFromEnv();
    const timeoutMs = providerTimeoutMsFromEnv();

    let sourceCode = `// EVM contract ${normalized}\ncontract Unknown {}`;
    let providerHealthy = true;
    let degradedModeReason: string | undefined;

    try {
      const response = await withRetry(
        async () =>
          axios.get(ETHERSCAN_API, {
            params: {
              module: 'contract',
              action: 'getsourcecode',
              address: normalized,
              apikey: process.env.ETHERSCAN_API_KEY,
            },
            timeout: timeoutMs,
          }),
        retry,
      );

      const result = response.data?.result?.[0];
      if (result?.SourceCode) {
        sourceCode = String(result.SourceCode);
      }
    } catch (error) {
      providerHealthy = false;
      degradedModeReason = error instanceof Error ? error.message : 'EVM explorer unavailable';
    }

    return {
      chain: 'evm',
      targetValue: target,
      normalizedTarget: normalized,
      sourceCode,
      metadata: {
        compiler: 'solidity',
        verifiedSource: sourceCode.includes('contract'),
        fetchedAt: Date.now(),
        providerHealthy,
        degradedModeReason,
        retryAttempts: retry.attempts,
      },
    };
  }
}
