import { CRYPTO_MOCK } from 'tests/crypto';
import { TraceSpanBuilder } from './trace-span.builder';
import { TraceSpanHelper } from '../helpers/trace-span.helper';
import { ITraceSpan } from '../types/trace-span';

describe(TraceSpanBuilder.name, () => {
  let mockUuid: string;
  let mockTraceId: string;
  let mockSpanId: string;
  let spyRandomUUID: jest.SpyInstance;
  let spyRandomTraceId: jest.SpyInstance;
  let spyRandomSpanId: jest.SpyInstance;

  beforeEach(async () => {
    mockUuid = CRYPTO_MOCK.randomUUID();
    mockTraceId = CRYPTO_MOCK.randomBytes(16).toString('hex');
    mockSpanId = CRYPTO_MOCK.randomBytes(8).toString('hex');
    spyRandomUUID = jest.spyOn(TraceSpanHelper, 'generateRandomValue').mockImplementation(() => mockUuid);
    spyRandomTraceId = jest.spyOn(TraceSpanHelper, 'generateTraceId').mockImplementation(() => mockTraceId);
    spyRandomSpanId = jest.spyOn(TraceSpanHelper, 'generateSpanId').mockImplementation(() => mockSpanId);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('build default', async () => {
    expect(TraceSpanBuilder.build()).toEqual({
      traceId: mockTraceId,
      spanId: mockSpanId,
      parentSpanId: mockSpanId,
    });

    expect(spyRandomUUID).toHaveBeenCalledTimes(0);
    expect(spyRandomTraceId).toHaveBeenCalledTimes(1);
    expect(spyRandomSpanId).toHaveBeenCalledTimes(1);
  });

  it('build custom', async () => {
    const initTS: ITraceSpan = {
      traceId: CRYPTO_MOCK.randomBytes(16).toString('hex'),
      spanId: CRYPTO_MOCK.randomBytes(8).toString('hex'),
      parentSpanId: CRYPTO_MOCK.randomBytes(8).toString('hex'),
      initialSpanId: CRYPTO_MOCK.randomBytes(8).toString('hex'),
    };

    expect(TraceSpanBuilder.build(initTS)).toEqual(initTS);

    expect(
      TraceSpanBuilder.build({
        ...initTS,
        parentSpanId: undefined,
        initialSpanId: undefined,
      }),
    ).toEqual({
      ...initTS,
      parentSpanId: initTS.spanId,
      initialSpanId: undefined,
    });

    expect(spyRandomUUID).toHaveBeenCalledTimes(0);
    expect(spyRandomTraceId).toHaveBeenCalledTimes(0);
    expect(spyRandomSpanId).toHaveBeenCalledTimes(0);
  });
});
