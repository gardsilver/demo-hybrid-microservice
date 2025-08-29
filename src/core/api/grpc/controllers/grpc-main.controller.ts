import { Controller, Inject } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { Metadata, StatusBuilder, ServerUnaryCall, status as GrpcStatus } from '@grpc/grpc-js';
import { MAIN_SERVICE_NAME, MainRequest, MainResponse } from 'protos/compiled/demo/service/MainService';
import { GeneralAsyncContext, IGeneralAsyncContext } from 'src/modules/common';
import { delay } from 'src/modules/date-timestamp';
import { GracefulShutdownOnCount } from 'src/modules/graceful-shutdown';
import {
  GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI,
  GrpcMetadataHelper,
  IGrpcMetadataResponseBuilder,
} from 'src/modules/grpc/grpc-server';
import { GrpcApiService } from '../services/grpc-api.service';

@Controller()
export class GrpcMainController {
  constructor(
    private readonly service: GrpcApiService,
    @Inject(GRPC_SERVER_METADATA_RESPONSE_BUILDER_DI)
    private readonly grpcMetadataResponseBuilder: IGrpcMetadataResponseBuilder,
  ) {}

  @GrpcMethod(MAIN_SERVICE_NAME, 'main')
  /**
   * Пример использования декоратора @GeneralAsyncContext.define
   * Тут указание аргумента request - обязательно.
   * 1) аргументы должны соответствовать аргументам вызова метода.
   * 2) Применение пользовательских декораторов-параметров конфликтует с GrpcMethod,
   *    поэтому используется GrpcMetadataHelper вместо @GrpcGeneralAsyncContext.
   */
  @GeneralAsyncContext.define((request, metadata) => {
    return GrpcMetadataHelper.getAsyncContext<IGeneralAsyncContext>(metadata);
  })
  @GracefulShutdownOnCount()
  async main(
    request: MainRequest,
    metadata: Metadata,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    call: ServerUnaryCall<any, any>,
  ): Promise<MainResponse> {
    await delay(4_000);

    const model = await this.service.getUser(request.query);

    const metadataResponse = this.grpcMetadataResponseBuilder.build({
      asyncContext: GeneralAsyncContext.instance.extend(),
      metadata,
    });

    if (model) {
      call.sendMetadata(metadataResponse);

      return {
        data: {
          status: 'ok',
          message: `${model.createdAt.toISOString()}: ${model.name}`,
        },
      };
    }

    throw new RpcException(
      new StatusBuilder()
        .withCode(GrpcStatus.NOT_FOUND)
        .withDetails('Not Found')
        .withMetadata(metadataResponse)
        .build(),
    );
  }
}
