import { ChainAnalysisArtifact, ChainId } from '../scoring/types';

export interface ChainAnalyzer {
  readonly chain: ChainId;
  normalizeTarget(target: string): string;
  isValidTarget(target: string): boolean;
  fetchArtifact(target: string): Promise<ChainAnalysisArtifact>;
}
