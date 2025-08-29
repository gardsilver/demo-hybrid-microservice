import { TimeoutError } from './timeout-error';

describe(TimeoutError.name, () => {
  it('TimeoutError', async () => {
    let error = new TimeoutError();

    expect(error.message).toEqual('Timeout');

    error = new TimeoutError(500);

    expect(error.message).toEqual('Timeout (0.5 sec)');

    error = new TimeoutError('My error');

    expect(error.message).toEqual('My error');
  });
});
