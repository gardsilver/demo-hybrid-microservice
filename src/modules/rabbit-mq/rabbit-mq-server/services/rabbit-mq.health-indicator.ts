import { tap } from 'rxjs';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { RmqStatus } from 'src/modules/rabbit-mq/rabbit-mq-common';
import { IConsumerInfo } from '../types/types';
import { RabbitMqServer } from './rabbit-mq-server';

export class RabbitMqHealthIndicator {
  private status: RmqStatus = RmqStatus.DISCONNECTED;

  constructor(
    private readonly serverName: string,
    private readonly server: RabbitMqServer,
  ) {
    this.server.status
      .pipe(
        tap((status) => {
          this.status = status as unknown as RmqStatus;
        }),
      )
      .subscribe();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const consumers: Record<string, IConsumerInfo> = {};

    this.server.getConsumersInfo().forEach((info, pattern) => {
      consumers[pattern] = info;
    });

    return {
      [this.serverName]: {
        status: [RmqStatus.CONNECTED].includes(this.status) ? 'up' : 'down',
        details: this.status,
        consumers,
      },
    };
  }
}
