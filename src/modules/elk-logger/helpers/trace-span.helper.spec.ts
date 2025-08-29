import { ITraceSpan } from '../types/trace-span';
import { TraceSpanHelper } from './trace-span.helper';

describe(TraceSpanHelper.name, () => {
  it('generateRandomValue, formatToZipkin and formatToGuid', async () => {
    expect(TraceSpanHelper.generateRandomValue()).toMatch(
      new RegExp(/^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/i),
    );
    expect(TraceSpanHelper.formatToGuid('6e247decff274ea8a530a16f3d1b4933')).toEqual(
      '6e247dec-ff27-4ea8-a530-a16f3d1b4933',
    );

    expect(
      TraceSpanHelper.toGuidFormat({
        traceId: '6e247decff274ea8a530a16f3d1b4933',
        spanId: '6e247decff274ea8a530a16f3d1b4933',
        initialSpanId: '6e247decff274ea8a530a16f3d1b4933',
        parentSpanId: '6e247decff274ea8a530a16f3d1b4933',
      } as ITraceSpan),
    ).toEqual({
      traceId: '6e247dec-ff27-4ea8-a530-a16f3d1b4933',
      spanId: '6e247dec-ff27-4ea8-a530-a16f3d1b4933',
      initialSpanId: '6e247dec-ff27-4ea8-a530-a16f3d1b4933',
      parentSpanId: '6e247dec-ff27-4ea8-a530-a16f3d1b4933',
    });

    expect(
      TraceSpanHelper.toGuidFormat({
        traceId: null,
        spanId: null,
        initialSpanId: null,
        parentSpanId: null,
      } as ITraceSpan),
    ).toEqual({
      traceId: null,
      spanId: null,
      initialSpanId: null,
      parentSpanId: null,
    });

    expect(TraceSpanHelper.formatToZipkin('6e247dec-ff27-4ea8-a530-a16f3d1b4933')).toEqual(
      '6e247decff274ea8a530a16f3d1b4933',
    );

    expect(
      TraceSpanHelper.toZipkinFormat({
        traceId: '6e247dec-ff27-4ea8-a530-a16f3d1b4933',
        spanId: '6e247dec-ff27-4ea8-a530-a16f3d1b4933',
        initialSpanId: '6e247dec-ff27-4ea8-a530-a16f3d1b4933',
        parentSpanId: '6e247dec-ff27-4ea8-a530-a16f3d1b4933',
      } as ITraceSpan),
    ).toEqual({
      traceId: '6e247decff274ea8a530a16f3d1b4933',
      spanId: '6e247decff274ea8a530a16f3d1b4933',
      initialSpanId: '6e247decff274ea8a530a16f3d1b4933',
      parentSpanId: '6e247decff274ea8a530a16f3d1b4933',
    });

    expect(
      TraceSpanHelper.toZipkinFormat({
        traceId: null,
        spanId: null,
        initialSpanId: null,
        parentSpanId: null,
      } as ITraceSpan),
    ).toEqual({
      traceId: null,
      spanId: null,
      initialSpanId: null,
      parentSpanId: null,
    });
  });
});
