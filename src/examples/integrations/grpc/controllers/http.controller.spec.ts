import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { AccessRoles, AuthStatus, IAuthInfo } from 'src/modules/auth';
import { IGeneralAsyncContext } from 'src/modules/common';
import { TraceSpanBuilder } from 'src/modules/elk-logger';
import { generalAsyncContextFactory } from 'tests/modules/common';
import { HttpController } from './http.controller';
import { GrpcService } from '../services/grpc.service';
import { SearchRequest } from '../types/dto';

describe(HttpController, () => {
  let context: IGeneralAsyncContext;
  let request: SearchRequest;
  let authInfo: IAuthInfo;

  let service: GrpcService;
  let controller: HttpController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: GrpcService,
          useValue: {
            search: jest.fn(),
          },
        },
      ],
      controllers: [HttpController],
    }).compile();

    service = module.get(GrpcService);
    controller = module.get(HttpController);

    request = {
      query: 'query',
      requestOptions: {
        timeout: faker.number.int(),
      },
      retryOptions: {
        timeout: faker.number.int(),
      },
    };
    authInfo = {
      status: AuthStatus.SUCCESS,
      roles: [AccessRoles.ADMIN],
    };

    context = generalAsyncContextFactory.build(TraceSpanBuilder.build({}) as unknown as IGeneralAsyncContext);

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });

  it('find', async () => {
    const spy = jest.spyOn(service, 'search').mockImplementation(async () => ({
      status: 'ok',
    }));

    const response = await controller.find(request, context, authInfo);

    expect(response).toEqual({
      status: 'ok',
    });
    expect(spy).toHaveBeenCalledWith(request, authInfo);
  });
});
