import { ChainId } from '../scoring/types';
import { EvmAnalyzer } from './evm-analyzer';
import { ChainAnalyzer } from './provider';
import { SolanaAnalyzer } from './solana-analyzer';
import { SuiAnalyzer } from './sui-analyzer';

const analyzers: Record<ChainId, ChainAnalyzer> = {
  sui: new SuiAnalyzer(),
  evm: new EvmAnalyzer(),
  solana: new SolanaAnalyzer(),
};

export function getAnalyzer(chain: ChainId): ChainAnalyzer {
  return analyzers[chain];
}

export function parseChain(value: string | undefined): ChainId {
  if (!value) return 'sui';
  if (value === 'sui' || value === 'evm' || value === 'solana') return value;
  throw new Error(`Unsupported chain '${value}'. Expected sui, evm, or solana.`);
}

export const SUPPORTED_CHAINS: ChainId[] = ['sui', 'evm', 'solana'];
