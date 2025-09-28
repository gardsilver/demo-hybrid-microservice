import { tap } from 'rxjs';
import { KafkaStatus, Server } from '@nestjs/microservices';
import { HealthIndicatorResult } from '@nestjs/terminus';

export class KafkaServerHealthIndicator {
  private status: KafkaStatus;
  private topics: string[];

  constructor(
    private readonly serverName: string,
    private readonly server: Server,
  ) {
    this.server.status
      .pipe(
        tap((status) => {
          this.status = status as undefined as KafkaStatus;
        }),
      )
      .subscribe();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    return {
      [this.serverName]: {
        status: [KafkaStatus.CONNECTED, KafkaStatus.REBALANCING].includes(this.status) ? 'up' : 'down',
        details: this.status,
        topics: this.getTopics(),
      },
    };
  }

  private getTopics(): string[] {
    if (!this.topics?.length) {
      this.topics = [...this.server.getHandlers().keys()];
    }

    return this.topics;
  }
}
