import { join } from 'path';
import { Module } from '@nestjs/common';
import { DEMO_SERVICE_PACKAGE_NAME } from 'protos/compiled/demo/service/MainService';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { PrometheusModule } from 'src/modules/prometheus';
import { GrpcClientModule } from 'src/modules/grpc/grpc-client';
import { AppConfig, AppModule } from 'src/core/app';
import { AuthModule } from 'src/modules/auth';
import { GrpcService } from './services/grpc.service';
import { HttpController } from './controllers/http.controller';

@Module({
  imports: [
    ElkLoggerModule,
    PrometheusModule,
    AuthModule,
    GrpcClientModule.register({
      imports: [AppModule],
      grpcClientProxyBuilderOptions: {
        inject: [AppConfig],
        useFactory: (config: AppConfig) => {
          return {
            url: `${config.getGrpcHost()}:${config.getGrpcPort()}`,
            package: DEMO_SERVICE_PACKAGE_NAME,
            baseDir: join(__dirname, '../../../../protos'),
            protoPath: ['/demo/service/MainService.proto'],
            includeDirs: [],
          };
        },
      },
      requestOptions: {
        useValue: {
          requestOptions: {
            timeout: 2_000,
          },
          retryOptions: {
            timeout: 10_000,
          },
        },
      },
    }),
  ],
  providers: [GrpcService],
  controllers: [HttpController],
})
export class ExampleGrpcModule {}
