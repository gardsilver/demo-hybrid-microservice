import { NestExpressApplication } from '@nestjs/platform-express';
import { MicroserviceOptions } from '@nestjs/microservices';
import { IRabbitMqMicroserviceBuilderOptions } from '../types/types';
import { RabbitMqServer } from '../services/rabbit-mq-server';
import { RabbitMqHealthIndicator } from '../services/rabbit-mq.health-indicator';

export abstract class RabbitMqMicroserviceBuilder {
  public static setup<T = unknown>(
    app: NestExpressApplication,
    options: IRabbitMqMicroserviceBuilderOptions<T>,
  ): {
    server: RabbitMqServer;
    serverHealthIndicator: RabbitMqHealthIndicator;
  } {
    const server = new RabbitMqServer(
      {
        serverName: options.serverName,
        ...options.consumer,
      },
      options.prometheusManager,
    );
    const serverHealthIndicator = new RabbitMqHealthIndicator(options.serverName, server);

    options.rabbitMqStatusService.addRabbitMqServices(options.serverName, server, serverHealthIndicator);

    app.connectMicroservice<MicroserviceOptions>(
      {
        strategy: server,
      },
      {
        inheritAppConfig: true,
      },
    );

    return {
      server,
      serverHealthIndicator,
    };
  }
}
