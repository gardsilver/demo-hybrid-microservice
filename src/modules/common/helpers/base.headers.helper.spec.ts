import { faker } from '@faker-js/faker';
import { IKeyValue } from '../types/types';
import { BaseHeadersHelper } from './base.headers.helper';

type HeaderValue = string | number | Buffer;
type RawHeaders = IKeyValue<HeaderValue | HeaderValue[]>;

describe(BaseHeadersHelper.name, () => {
  let traceId: string;
  let spanId: string;
  let rawHeaders: RawHeaders;

  beforeEach(async () => {
    traceId = faker.string.uuid();
    spanId = faker.string.uuid();

    rawHeaders = {
      'x-trace-id': traceId,
      'bin-span-id': [Buffer.from(spanId, 'utf8')],
      'program-ids': [10, 32],
      empty: undefined,
      'empty-string': '',
      'empty-array': [],
    };
  });

  it('normalize', async () => {
    expect(BaseHeadersHelper.normalize(rawHeaders)).toEqual({
      'x-trace-id': traceId,
      'bin-span-id': [spanId],
      'program-ids': ['10', '32'],
      'empty-array': [],
      'empty-string': '',
    });
  });

  it('searchValue', async () => {
    const normalize = BaseHeadersHelper.normalize(rawHeaders);

    expect(BaseHeadersHelper.searchValue(normalize, 'x-b3-trace-id')).toEqual({});
    expect(BaseHeadersHelper.searchValue(normalize, 'x-trace-id', 'x-b3-trace-id')).toEqual({
      header: 'x-trace-id',
      value: traceId,
    });
    expect(BaseHeadersHelper.searchValue(normalize, 'program-ids')).toEqual({
      header: 'program-ids',
      value: ['10', '32'],
    });
    expect(BaseHeadersHelper.searchValue(normalize, 'empty-array')).toEqual({
      header: 'empty-array',
      value: undefined,
    });
    expect(BaseHeadersHelper.searchValue(normalize, 'empty')).toEqual({
      header: undefined,
      value: undefined,
    });
    expect(BaseHeadersHelper.searchValue(normalize, 'empty-string')).toEqual({
      header: 'empty-string',
      value: undefined,
    });
  });
});
