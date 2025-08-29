import { randomUUID } from 'node:crypto';
import { TraceSpanBuilder } from './trace-span.builder';
import { TraceSpanHelper } from '../helpers/trace-span.helper';

describe(TraceSpanBuilder.name, () => {
  let mockUuid;
  let spyRandomUUID;

  beforeEach(async () => {
    mockUuid = randomUUID();
    spyRandomUUID = jest.spyOn(TraceSpanHelper, 'generateRandomValue').mockImplementation(() => mockUuid);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('build default', async () => {
    expect(TraceSpanBuilder.build()).toEqual({
      traceId: mockUuid,
      spanId: mockUuid,
      parentSpanId: mockUuid,
    });

    expect(spyRandomUUID).toHaveBeenCalledTimes(2);
  });

  it('build default', async () => {
    expect(
      TraceSpanBuilder.build({
        traceId: 'traceId',
        spanId: 'spanId',
        parentSpanId: 'parentSpanId',
        initialSpanId: 'initialSpanId',
      }),
    ).toEqual({
      traceId: 'traceId',
      spanId: 'spanId',
      parentSpanId: 'parentSpanId',
      initialSpanId: 'initialSpanId',
    });

    expect(spyRandomUUID).toHaveBeenCalledTimes(0);
  });
});
