import { AxiosError, AxiosResponse } from 'axios';
import { HttpStatus } from '@nestjs/common';
import { HttHeadersHelper } from 'src/modules/http/http-common';
import { IHeaders } from 'src/modules/common';
import { httpHeadersFactory } from 'tests/modules/http/http-common';
import { HttpClientExternalError } from '../../errors/http-client.external.error';
import { HttpClientErrorFormatter } from './http-client.error.object-formatter';

describe(HttpClientErrorFormatter.name, () => {
  let headers: IHeaders;
  let axiosResponse: AxiosResponse;
  let error: AxiosError;
  let formatter: HttpClientErrorFormatter;

  beforeEach(async () => {
    formatter = new HttpClientErrorFormatter();

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

  it('isInstanceOf', async () => {
    expect(formatter.isInstanceOf(null)).toBeFalsy();
    expect(formatter.isInstanceOf(undefined)).toBeFalsy();
    expect(formatter.isInstanceOf('')).toBeFalsy();
    expect(formatter.isInstanceOf({})).toBeFalsy();
    expect(formatter.isInstanceOf(new Error())).toBeFalsy();
    expect(formatter.isInstanceOf(new HttpClientExternalError('Tets error', 12))).toBeTruthy();
  });

  it('transform', async () => {
    let handleError = new HttpClientExternalError('Test Error', 400, error, axiosResponse);

    expect(formatter.transform(handleError)).toEqual({
      statusCode: 400,
      response: {
        status: 400,
        data: { status: 'error' },
        headers: HttHeadersHelper.normalize(headers),
      },
    });

    axiosResponse.headers = undefined as unknown as AxiosResponse['headers'];

    expect(formatter.transform(handleError)).toEqual({
      statusCode: 400,
      response: {
        status: 400,
        data: { status: 'error' },
      },
    });

    handleError = new HttpClientExternalError('Test Error', 400, error);

    expect(formatter.transform(handleError)).toEqual({
      statusCode: 400,
    });
  });
});
