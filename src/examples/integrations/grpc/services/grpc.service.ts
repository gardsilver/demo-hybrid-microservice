import { Inject, Injectable } from '@nestjs/common';
import { MainRequest, MainResponse, MAIN_SERVICE_NAME } from 'protos/compiled/demo/service/MainService';
import { SearchResponse } from 'src/examples/integrations/common';
import { AUTH_SERVICE_DI, IAccessTokenData, IAuthInfo, IAuthService } from 'src/modules/auth';
import { GrpcClientService } from 'src/modules/grpc/grpc-client';
import { SearchRequest } from '../types/dto';

@Injectable()
export class GrpcService {
  constructor(
    @Inject(AUTH_SERVICE_DI) private readonly authService: IAuthService,
    private readonly grpcClientService: GrpcClientService,
  ) {}

  async search(request: SearchRequest, authInfo: IAuthInfo): Promise<SearchResponse> {
    const response = await this.grpcClientService.request<MainRequest, MainResponse>(
      {
        service: MAIN_SERVICE_NAME,
        method: 'main',
        data: { query: request.query },
      },
      {
        metadataBuilderOptions: {
          authToken: this.getAccessToken(authInfo),
        },
        requestOptions: request.requestOptions,
        retryOptions: request.retryOptions,
      },
    );

    if (response) {
      return {
        ...response.data,
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
