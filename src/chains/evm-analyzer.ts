import axios from 'axios';
import { ethers } from 'ethers';
import { ChainAnalysisArtifact } from '../scoring/types';
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
    let sourceCode = `// EVM contract ${normalized}\ncontract Unknown {}`;

    try {
      const response = await axios.get(ETHERSCAN_API, {
        params: {
          module: 'contract',
          action: 'getsourcecode',
          address: normalized,
          apikey: process.env.ETHERSCAN_API_KEY,
        },
        timeout: 10000,
      });
      const result = response.data?.result?.[0];
      if (result?.SourceCode) {
        sourceCode = String(result.SourceCode);
      }
    } catch {
      // Keep fallback source.
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
      },
    };
  }
}
