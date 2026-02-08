import { parseChain } from '../../src/chains';

describe('parseChain', () => {
  it('defaults to sui', () => {
    expect(parseChain(undefined)).toBe('sui');
  });

  it('accepts supported chains', () => {
    expect(parseChain('sui')).toBe('sui');
    expect(parseChain('evm')).toBe('evm');
    expect(parseChain('solana')).toBe('solana');
  });

  it('rejects unsupported values', () => {
    expect(() => parseChain('base')).toThrow('Unsupported chain');
  });
});
