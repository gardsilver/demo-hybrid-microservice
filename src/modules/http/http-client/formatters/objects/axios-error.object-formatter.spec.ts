import { AxiosError, AxiosResponse } from 'axios';
import { HttpStatus } from '@nestjs/common';
import { HttHeadersHelper } from 'src/modules/http/http-common';
import { IHeaders } from 'src/modules/common';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { AxiosErrorFormatter } from './axios-error.object-formatter';

describe(AxiosErrorFormatter.name, () => {
  let headers: IHeaders;
  let axiosResponse: AxiosResponse;
  let error: AxiosError;
  let formatter: AxiosErrorFormatter;

  beforeEach(async () => {
    formatter = new AxiosErrorFormatter();

    headers = httpHeadersFactory.build(
      {
        programsIds: ['1', '30'],
      },
      {
        transient: {
          traceId: undefined,
          spanId: undefined,
          requestId: undefined,
          correlationId: undefined,
        },
      },
    );

    axiosResponse = {
      status: HttpStatus.BAD_REQUEST,
      data: { status: 'error' },
      headers,
    } as AxiosResponse;
    error = new AxiosError(
      'Get response with status 400',
      AxiosError.ERR_BAD_REQUEST,
      undefined,
      undefined,
      axiosResponse,
    );
  });

  it('canFormat', async () => {
    expect(formatter.canFormat(null)).toBeFalsy();
    expect(formatter.canFormat(undefined)).toBeFalsy();
    expect(formatter.canFormat('')).toBeFalsy();
    expect(formatter.canFormat({})).toBeFalsy();
    expect(formatter.canFormat(new Error())).toBeFalsy();
    expect(formatter.canFormat(error)).toBeTruthy();
  });

  it('transform', async () => {
    expect(formatter.transform(error)).toEqual({
      code: 'ERR_BAD_REQUEST',
      status: HttpStatus.BAD_REQUEST,
      response: {
        status: 400,
        data: { status: 'error' },
        headers: HttHeadersHelper.normalize(headers),
      },
    });

    axiosResponse.headers = undefined;

    expect(formatter.transform(error)).toEqual({
      code: 'ERR_BAD_REQUEST',
      status: HttpStatus.BAD_REQUEST,
      response: {
        status: 400,
        data: { status: 'error' },
      },
    });

    error = new AxiosError('Get response with status 400', AxiosError.ERR_BAD_REQUEST, undefined, undefined, undefined);

    expect(formatter.transform(error)).toEqual({
      code: 'ERR_BAD_REQUEST',
    });
  });
});
