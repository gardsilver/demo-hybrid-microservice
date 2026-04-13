import { Injectable } from '@nestjs/common';
import { GracefulShutdownEvents, GracefulShutdownOnEvent } from 'src/modules/graceful-shutdown';
import { RabbitMqServer } from './rabbit-mq-server';
import { RabbitMqHealthIndicator } from './rabbit-mq.health-indicator';

@Injectable()
export class RabbitMqServerStatusService {
  private readonly rabbitMqServices: Array<{
    serverName: string;
    server: RabbitMqServer;
    healthIndicator: RabbitMqHealthIndicator;
  }> = [];

  addRabbitMqServices(serverName: string, server: RabbitMqServer, healthIndicator: RabbitMqHealthIndicator): void {
    this.rabbitMqServices.push({
      serverName,
      server,
      healthIndicator,
    });
  }

  getHealthIndicators(): RabbitMqHealthIndicator[] {
    return this.rabbitMqServices.map((services) => services.healthIndicator);
  }

  @GracefulShutdownOnEvent({
    event: GracefulShutdownEvents.BEFORE_DESTROY,
  })
  async beforeDestroy(): Promise<void> {
    const tasks: Promise<unknown>[] = [];

    this.rabbitMqServices.forEach((service) => {
      tasks.push(service.server.close());
    });

    await Promise.all(tasks);
  }
}
