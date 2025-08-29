import { Inject, Injectable } from '@nestjs/common';
import { AUTH_SERVICE_DI, IAccessTokenData, IAuthInfo, IAuthService } from 'src/modules/auth';
import { HttpClientService } from 'src/modules/http/http-client';
import { BaseRequest, SearchResponse } from 'src/examples/integrations/common';

@Injectable()
export class HttpService {
  constructor(
    @Inject(AUTH_SERVICE_DI) private readonly authService: IAuthService,
    private readonly httpClientService: HttpClientService,
  ) {}

  async search(request: BaseRequest, authInfo: IAuthInfo): Promise<SearchResponse> {
    const response = await this.httpClientService.request(
      {
        url: 'app',
        method: 'GET',
        timeout: request.requestOptions?.timeout,
      },
      {
        headersBuilderOptions: {
          authToken: this.getAccessToken(authInfo),
        },
        retryOptions: request.retryOptions,
      },
    );

    if (response) {
      return {
        status: 'ok',
        message: response,
      };
    }

    return {
      status: 'Not Found',
    };
  }

  private getAccessToken(authInfo: IAuthInfo) {
    const accessToken: IAccessTokenData = { roles: authInfo.roles };

    return this.authService.getJwtToken(accessToken);
  }
}
