import { CRYPTO_MOCK } from 'tests/crypto';
import { TraceSpanHelper } from './trace-span.helper';

jest.mock('crypto', () => ({ ...jest.requireActual('crypto'), ...jest.requireActual('tests/crypto').CRYPTO_MOCK }));

describe(TraceSpanHelper.name, () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('generateRandomValue', async () => {
    expect(TraceSpanHelper.generateRandomValue()).toMatch(
      new RegExp(/^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/i),
    );

    expect(CRYPTO_MOCK.randomUUID).toHaveBeenCalledTimes(1);
    expect(CRYPTO_MOCK.randomBytes).toHaveBeenCalledTimes(0);
  });

  it('generateTraceId', async () => {
    expect(TraceSpanHelper.generateTraceId().length).toBe(32);

    expect(CRYPTO_MOCK.randomUUID).toHaveBeenCalledTimes(0);
    expect(CRYPTO_MOCK.randomBytes).toHaveBeenCalledTimes(1);
  });

  it('generateSpanId', async () => {
    expect(TraceSpanHelper.generateSpanId().length).toBe(16);

    expect(CRYPTO_MOCK.randomUUID).toHaveBeenCalledTimes(0);
    expect(CRYPTO_MOCK.randomBytes).toHaveBeenCalledTimes(1);
  });

  it('formatToGuid', async () => {
    expect(TraceSpanHelper.formatToGuid('6e247decff274ea8a530a16f3d1b4933')).toEqual(
      '6e247dec-ff27-4ea8-a530-a16f3d1b4933',
    );
  });

  it('formatToZipkin', async () => {
    expect(TraceSpanHelper.formatToZipkin('6e247dec-ff27-4ea8-a530-a16f3d1b4933')).toEqual(
      '6e247decff274ea8a530a16f3d1b4933',
    );
    expect(TraceSpanHelper.formatToZipkin('6E247DEC-FF27-4EA8-A530-A16F3D1B4933')).toEqual(
      '6e247decff274ea8a530a16f3d1b4933',
    );
  });

  it('generateRandomValue, formatToZipkin and formatToGuid', async () => {
    expect(TraceSpanHelper.generateRandomValue()).toMatch(
      new RegExp(/^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/i),
    );
    expect(TraceSpanHelper.formatToGuid('6e247decff274ea8a530a16f3d1b4933')).toEqual(
      '6e247dec-ff27-4ea8-a530-a16f3d1b4933',
    );
  });
});
