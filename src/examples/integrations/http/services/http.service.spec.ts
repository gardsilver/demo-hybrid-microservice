import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { AccessRoles, AUTH_SERVICE_DI, AuthStatus, IAuthInfo, IAuthService } from 'src/modules/auth';
import { HttpClientService } from 'src/modules/http/http-client';
import { BaseRequest } from 'src/examples/integrations/common';
import { HttpService } from './http.service';

describe(HttpService.name, () => {
  let jwtToken: string;

  let request: BaseRequest;
  let authInfo: IAuthInfo;

  let authService: IAuthService;
  let clientService: HttpClientService;
  let service: HttpService;

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
          provide: HttpClientService,
          useValue: {
            request: jest.fn,
          },
        },
        HttpService,
      ],
    }).compile();

    authService = module.get(AUTH_SERVICE_DI);
    clientService = module.get(HttpClientService);
    service = module.get(HttpService);

    request = {
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
    const spyRequest = jest.spyOn(clientService, 'request').mockImplementation(async () => 'Hello World!');

    const response = await service.search(request, authInfo);

    expect(response).toEqual({
      status: 'ok',
      message: 'Hello World!',
    });
    expect(spyToken).toHaveBeenCalledWith({ roles: authInfo.roles });
    expect(spyRequest).toHaveBeenCalledWith(
      {
        url: 'app',
        method: 'GET',
        timeout: request.requestOptions?.timeout,
      },
      {
        headersBuilderOptions: {
          authToken: jwtToken,
        },
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
