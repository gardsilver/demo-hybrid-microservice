// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require('jsonwebtoken');
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { GeneralAsyncContext } from 'src/modules/common';
import { MILLISECONDS_IN_SECOND } from 'src/modules/date-timestamp';
import {
  ELK_LOGGER_SERVICE_BUILDER_DI,
  IElkLoggerService,
  IElkLoggerServiceBuilder,
  TraceSpanBuilder,
} from 'src/modules/elk-logger';
import { IAuthService, ICertificateService } from '../types/interfaces';
import { IAccessTokenData, AuthStatus, IAuthInfo } from '../types/types';
import { AUTH_CERTIFICATE_SERVICE_DI } from '../types/tokens';

@Injectable()
export class AuthService implements IAuthService, OnModuleInit {
  private logger: IElkLoggerService;
  private certificate: string | null = null;

  constructor(
    @Inject(ELK_LOGGER_SERVICE_BUILDER_DI)
    private readonly loggerBuilder: IElkLoggerServiceBuilder,
    @Inject(AUTH_CERTIFICATE_SERVICE_DI)
    private readonly certificateService: ICertificateService,
  ) {
    this.logger = this.loggerBuilder.build({
      module: AuthService.name,
    });
  }

  public synchronized(): boolean {
    return this.certificate !== null;
  }

  public async authenticate(jwtString: string | null): Promise<IAuthInfo> {
    const result: IAuthInfo = {
      status: AuthStatus.TOKEN_ABSENT,
    };

    if (!jwtString || jwtString === '' || typeof jwtString !== 'string') {
      return result;
    }

    const accessToken = jwt.decode(jwtString, { json: true });

    if (accessToken === null || typeof accessToken !== 'object') {
      result.status = AuthStatus.TOKEN_PARSE_ERROR;

      return result;
    }

    if (!(await this.verifyToken(jwtString))) {
      result.status = AuthStatus.VERIFY_FAILED;

      return result;
    }

    result.status = AuthStatus.SUCCESS;
    result.roles = accessToken['roles'];

    return result;
  }

  public getJwtToken(dataToken: IAccessTokenData): string {
    return this.certificate !== null ? jwt.sign(dataToken, this.certificate) : undefined;
  }

  @GeneralAsyncContext.define(() => {
    return TraceSpanBuilder.build();
  })
  public async onModuleInit() {
    this.logger.info('Getting certificate start');

    await this.certs();
  }

  private async certs(): Promise<void> {
    this.certificate = await this.certificateService.getCert();

    if (!this.certificate) {
      this.logger.info('Getting certificate repeat');

      setTimeout(() => {
        this.certs().catch(() => {
          this.certificate = null;
        });
      }, 5 * MILLISECONDS_IN_SECOND);
    } else {
      this.logger.info('Getting certificate success');
    }
  }

  private async verifyToken(jwtString: string): Promise<boolean> {
    try {
      jwt.verify(jwtString, this.certificate);
    } catch {
      return false;
    }

    return true;
  }
}
