import { Injectable } from '@nestjs/common';
import { Server } from '@nestjs/microservices';
import { GracefulShutdownEvents, GracefulShutdownOnEvent } from 'src/modules/graceful-shutdown';
import { KafkaOptionsBuilder } from 'src/modules/kafka/kafka-common';
import { KafkaServerHealthIndicator } from './kafka-server.health-indicator';

@Injectable()
export class KafkaServerStatusService {
  private readonly kafkaServices: Array<{
    serverName: string;
    server: Server;
    optionsBuilder: KafkaOptionsBuilder;
    healthIndicator: KafkaServerHealthIndicator;
  }> = [];

  addKafkaServices(
    serverName: string,
    server: Server,
    optionsBuilder: KafkaOptionsBuilder,
    healthIndicator: KafkaServerHealthIndicator,
  ) {
    this.kafkaServices.push({
      serverName,
      server,
      optionsBuilder,
      healthIndicator,
    });
  }

  getHealthIndicators(): KafkaServerHealthIndicator[] {
    return this.kafkaServices.map((kafkaServices) => kafkaServices.healthIndicator);
  }

  @GracefulShutdownOnEvent({
    event: GracefulShutdownEvents.BEFORE_DESTROY,
  })
  async beforeDestroy(): Promise<void> {
    const tasks = [];

    this.kafkaServices.forEach((kafkaServices) => {
      tasks.push(
        new Promise((resolve) => {
          kafkaServices.optionsBuilder.stop();
          resolve(true);
        }),
      );
      tasks.push(kafkaServices.server.close());
    });

    await Promise.all(tasks);
  }
}
