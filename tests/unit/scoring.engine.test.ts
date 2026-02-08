import { buildSecurityReport } from '../../src/scoring/engine';

describe('buildSecurityReport', () => {
  it('returns high risk when critical patterns are detected', () => {
    const report = buildSecurityReport({
      artifact: {
        chain: 'evm',
        targetValue: '0x1111111111111111111111111111111111111111',
        normalizedTarget: '0x1111111111111111111111111111111111111111',
        sourceCode: 'function mint(address to,uint amount) public onlyOwner {} mapping(address=>bool) blacklist; function _transfer(){}',
        metadata: { verifiedSource: true, fetchedAt: Date.now() },
      },
      targetType: 'address',
      startedAt: Date.now() - 25,
    });

    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.score).toBeLessThan(80);
    expect(['medium', 'high', 'critical']).toContain(report.riskLevel);
  });

  it('returns safe when no risky patterns are found', () => {
    const report = buildSecurityReport({
      artifact: {
        chain: 'sui',
        targetValue: '0x'.padEnd(66, 'a'),
        normalizedTarget: '0x'.padEnd(66, 'a'),
        sourceCode: 'module rugshield::safe { public fun ping() {} }',
        metadata: { verifiedSource: false, fetchedAt: Date.now() },
      },
      targetType: 'address',
      startedAt: Date.now() - 20,
    });

    expect(report.findings).toHaveLength(0);
    expect(report.score).toBe(100);
    expect(report.riskLevel).toBe('safe');
  });
});
