import { withRetry } from '../../src/utils/retry';

describe('withRetry', () => {
  it('retries until success', async () => {
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error('temporary failure');
        return 'ok';
      },
      { attempts: 3, baseDelayMs: 1 },
    );

    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('throws after max attempts', async () => {
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts += 1;
          throw new Error('fail');
        },
        { attempts: 2, baseDelayMs: 1 },
      ),
    ).rejects.toThrow('fail');

    expect(attempts).toBe(2);
  });
});
