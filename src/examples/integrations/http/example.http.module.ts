import { Module } from '@nestjs/common';
import { AppConfig, AppModule } from 'src/core/app';
import { AuthModule } from 'src/modules/auth';
import { ElkLoggerModule } from 'src/modules/elk-logger';
import { HttpClientModule } from 'src/modules/http/http-client';
import { PrometheusModule } from 'src/modules/prometheus';
import { HttpService } from './services/http.service';
import { HttpController } from './controllers/http.controller';

@Module({
  imports: [
    ElkLoggerModule,
    PrometheusModule,
    AuthModule,
    HttpClientModule.register({
      httpModuleOptions: {
        imports: [AppModule],
        options: {
          inject: [AppConfig],
          useFactory: (config: AppConfig) => ({
            baseURL: `http://127.0.0.1:${config.getServicePort()}/api`,
            timeout: 2_000,
          }),
        },
      },
      requestOptions: {
        useValue: {
          retryOptions: {
            timeout: 10_000,
            retryMaxCount: 5,
          },
        },
      },
    }),
  ],
  providers: [HttpService],
  controllers: [HttpController],
})
export class ExampleHttpModule {}
