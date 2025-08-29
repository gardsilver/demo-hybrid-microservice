import { Test } from '@nestjs/testing';
import { faker } from '@faker-js/faker';
import { ELK_LOGGER_SERVICE_BUILDER_DI, IElkLoggerService } from 'src/modules/elk-logger';
import { MockElkLoggerService } from 'tests/modules/elk-logger';
import { AuthService } from './auth.service';
import { AUTH_CERTIFICATE_SERVICE_DI } from '../types/tokens';
import { MockCertificateService } from './mock.certificate.service';
import { AccessRoles, AuthStatus, IAccessTokenData } from '../types/types';

describe(AuthService.name, () => {
  const mockCert = '801c29c6-ed2f-4ae4-92fb-fafe914893c0';
  const mockJwtToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlcyI6WyJ1c2VyIl0sImlhdCI6MTc1MzM1NjY5Nn0.DcNta87qkdFVve3LuFO5yyrsqWWdIhxuIKAeO-sTcW4';
  let logger: IElkLoggerService;
  let service: AuthService;
  let indexTest = 0;

  beforeEach(async () => {
    jest.useFakeTimers();

    logger = new MockElkLoggerService();

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: ELK_LOGGER_SERVICE_BUILDER_DI,
          useValue: {
            build: jest.fn().mockImplementation(() => logger),
          },
        },
        {
          provide: AUTH_CERTIFICATE_SERVICE_DI,
          useValue: new MockCertificateService({
            useCertificate: mockCert,
          }),
        },
        AuthService,
      ],
    }).compile();

    if (indexTest > 0) {
      jest.advanceTimersByTimeAsync(10_000);

      await module.init();
    }

    service = module.get(AuthService);

    jest.clearAllMocks();

    ++indexTest;
  });

  it('init', async () => {
    expect(service).toBeDefined();
    expect(service.synchronized()).toBeFalsy();
  });

  it('synchronized', async () => {
    expect(service.synchronized()).toBeTruthy();
    expect(service['certificate']).toEqual(mockCert);
  });

  describe('getJwtToken', () => {
    it('create jwt token', async () => {
      const dataToken: IAccessTokenData = {
        roles: [AccessRoles.ADMIN, AccessRoles.USER],
      };

      const jwtToken = service.getJwtToken(dataToken);

      expect(jwtToken).toBeDefined();
      expect(typeof jwtToken === 'string').toBeTruthy();
    });
  });

  describe('authenticate', () => {
    it('tokenAbsent', async () => {
      expect(await service.authenticate(null)).toEqual({
        status: AuthStatus.TOKEN_ABSENT,
      });

      expect(await service.authenticate('')).toEqual({
        status: AuthStatus.TOKEN_ABSENT,
      });
    });

    it('tokenParseError', async () => {
      expect(await service.authenticate('tassdfergfrg')).toEqual({
        status: AuthStatus.TOKEN_PARSE_ERROR,
      });
    });

    it('success', async () => {
      expect(await service.authenticate(mockJwtToken)).toEqual({
        status: AuthStatus.SUCCESS,
        roles: ['user'],
      });
    });

    it('verifyFailed', async () => {
      service['certificate'] = faker.string.uuid();

      expect(service['certificate']).not.toEqual(mockCert);

      expect(await service.authenticate(mockJwtToken)).toEqual({
        status: AuthStatus.VERIFY_FAILED,
      });
    });
  });
});
