import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { AccessRoles, AUTH_SERVICE_DI, AuthStatus, IAuthInfo, IAuthService } from 'src/modules/auth';
import { GrpcClientService } from 'src/modules/grpc/grpc-client';
import { GrpcService } from './grpc.service';
import { SearchRequest } from '../types/dto';

describe(GrpcService.name, () => {
  let jwtToken: string;

  let request: SearchRequest;
  let authInfo: IAuthInfo;

  let authService: IAuthService;
  let clientService: GrpcClientService;
  let service: GrpcService;

  beforeEach(async () => {
    jwtToken = faker.string.uuid().replace('-', '');

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: AUTH_SERVICE_DI,
          useValue: {
            getJwtToken: () => jwtToken,
          },
        },
        {
          provide: GrpcClientService,
          useValue: {
            request: jest.fn,
          },
        },
        GrpcService,
      ],
    }).compile();

    authService = module.get(AUTH_SERVICE_DI);
    clientService = module.get(GrpcClientService);
    service = module.get(GrpcService);

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

    jest.clearAllMocks();
  });

  it('init', async () => {
    expect(authService).toBeDefined();
    expect(clientService).toBeDefined();
    expect(service).toBeDefined();
  });

  it('search success', async () => {
    const spyToken = jest.spyOn(authService, 'getJwtToken');
    const spyRequest = jest.spyOn(clientService, 'request').mockImplementation(async () => ({
      data: {
        status: 'ok',
      },
    }));

    const response = await service.search(request, authInfo);

    expect(response).toEqual({
      status: 'ok',
    });
    expect(spyToken).toHaveBeenCalledWith({ roles: authInfo.roles });
    expect(spyRequest).toHaveBeenCalledWith(
      {
        service: 'MainService',
        method: 'main',
        data: { query: request.query },
      },
      {
        metadataBuilderOptions: {
          authToken: jwtToken,
        },
        requestOptions: request.requestOptions,
        retryOptions: request.retryOptions,
      },
    );
  });

  it('search Not Found', async () => {
    jest.spyOn(clientService, 'request').mockImplementation(async () => null);

    const response = await service.search(request, authInfo);

    expect(response).toEqual({
      status: 'Not Found',
    });
  });
});
