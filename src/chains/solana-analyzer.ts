import { ChainAnalysisArtifact } from '../scoring/types';
import { ChainAnalyzer } from './provider';

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
      },
    };
  }
}
