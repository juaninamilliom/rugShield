import { logInfo } from '../../src/utils/logger';

describe('logger', () => {
  it('emits json log lines with message and level', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    logInfo('test_event', { requestId: 'req-1' });

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(spy.mock.calls[0][0]));
    expect(payload.level).toBe('info');
    expect(payload.message).toBe('test_event');
    expect(payload.requestId).toBe('req-1');

    spy.mockRestore();
  });
});
