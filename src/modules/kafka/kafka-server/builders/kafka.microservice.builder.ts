import { NestExpressApplication } from '@nestjs/platform-express';
import { MicroserviceOptions } from '@nestjs/microservices';
import { KafkaOptionsBuilder } from 'src/modules/kafka/kafka-common';
import { IKafkaMicroserviceBuilderOptions } from '../types/types';
import { KafkaServerHealthIndicator } from '../services/kafka-server.health-indicator';
import { KafkaServerService } from '../services/kafka-server.service';

export class KafkaMicroserviceBuilder {
  public static setup<T = unknown>(
    app: NestExpressApplication,
    options: IKafkaMicroserviceBuilderOptions<T>,
  ): {
    server: KafkaServerService;
    serverHealthIndicator: KafkaServerHealthIndicator;
  } {
    const optionsBuilder = new KafkaOptionsBuilder(options.loggerBuilder, options.prometheusManager);
    const kafkaOptions = optionsBuilder.build(options.kafkaOptions);
    const server = new KafkaServerService(
      {
        ...kafkaOptions,
        serverName: options.kafkaOptions.serverName,
        headerAdapter: options.kafkaOptions.headerAdapter,
      },
      options.prometheusManager,
    );

    const healthIndicator = new KafkaServerHealthIndicator(options.kafkaOptions.serverName, server);

    options.kafkaStatusService.addKafkaServices(
      options.kafkaOptions.serverName,
      server,
      optionsBuilder,
      healthIndicator,
    );

    app.connectMicroservice<MicroserviceOptions>(
      {
        strategy: server,
      },
      {
        inheritAppConfig: true,
      },
    );

    return {
      server: server,
      serverHealthIndicator: healthIndicator,
    };
  }
}
