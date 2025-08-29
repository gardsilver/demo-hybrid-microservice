import { Test } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { HttpErrorResponseFilter } from 'src/modules/http/http-server';
import { GrpcErrorResponseFilter } from 'src/modules/grpc/grpc-server';
import { HybridErrorResponseFilter } from './hybrid.error-response.filter';

describe(HybridErrorResponseFilter.name, () => {
  let httpErrorResponseFilter: HttpErrorResponseFilter;
  let grpcErrorResponseFilter: GrpcErrorResponseFilter;
  let filter: HybridErrorResponseFilter;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: HttpErrorResponseFilter,
          useValue: {
            catch: jest.fn(),
          },
        },
        {
          provide: GrpcErrorResponseFilter,
          useValue: {
            catch: jest.fn(),
          },
        },
        HybridErrorResponseFilter,
      ],
    }).compile();

    httpErrorResponseFilter = module.get(HttpErrorResponseFilter);
    grpcErrorResponseFilter = module.get(GrpcErrorResponseFilter);
    filter = module.get(HybridErrorResponseFilter);

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(httpErrorResponseFilter).toBeDefined();
    expect(grpcErrorResponseFilter).toBeDefined();
    expect(filter).toBeDefined();
  });

  it('ignore', async () => {
    const host = {
      getType: () => 'tcp',
    } as undefined as ExecutionContext;
    const error = new Error('Test Error');

    const spyHttp = jest.spyOn(httpErrorResponseFilter, 'catch');
    const spyGrpc = jest.spyOn(grpcErrorResponseFilter, 'catch');

    await filter.catch(error, host);

    expect(spyHttp).toHaveBeenCalledTimes(0);
    expect(spyGrpc).toHaveBeenCalledTimes(0);
  });

  it('http', async () => {
    const host = {
      getType: () => 'http',
    } as undefined as ExecutionContext;
    const error = new Error('Test Error');

    const spyHttp = jest.spyOn(httpErrorResponseFilter, 'catch');
    const spyGrpc = jest.spyOn(grpcErrorResponseFilter, 'catch');

    await filter.catch(error, host);

    expect(spyHttp).toHaveBeenCalledTimes(1);
    expect(spyHttp).toHaveBeenCalledWith(error, host);
    expect(spyGrpc).toHaveBeenCalledTimes(0);
  });

  it('grpc', async () => {
    const host = {
      getType: () => 'rpc',
    } as undefined as ExecutionContext;
    const error = new Error('Test Error');

    const spyHttp = jest.spyOn(httpErrorResponseFilter, 'catch');
    const spyGrpc = jest.spyOn(grpcErrorResponseFilter, 'catch');

    await filter.catch(error, host);

    expect(spyHttp).toHaveBeenCalledTimes(0);
    expect(spyGrpc).toHaveBeenCalledTimes(1);
    expect(spyGrpc).toHaveBeenCalledWith(error, host);
  });
});
