import { tap } from 'rxjs';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { KafkaStatus } from '@nestjs/microservices';
import { Admin } from '@nestjs/microservices/external/kafka.interface';
import { KafkaRetryConfig } from 'src/modules/kafka/kafka-common';
import { KafkaServerService } from './kafka-server.service';

export class KafkaServerHealthIndicator {
  private status: KafkaStatus = KafkaStatus.DISCONNECTED;
  private topics: string[];
  private admin: Admin;

  constructor(
    private readonly serverName: string,
    private readonly server: KafkaServerService,
    private readonly options?: {
      useAdmin?: boolean;
      retry?: KafkaRetryConfig;
    },
  ) {
    this.server.status
      .pipe(
        tap((status) => {
          this.status = status as unknown as KafkaStatus;
        }),
      )
      .subscribe();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    if (this.options?.useAdmin === true) {
      const status = await this.ping();

      return {
        [this.serverName]: {
          status: status === KafkaStatus.CONNECTED.toString() ? 'up' : 'down',
          details: status,
          topics: this.getTopics(),
        },
      };
    }

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

  private async ping(): Promise<string> {
    try {
      const admin = this.getAmin();
      if (admin === null) {
        return KafkaStatus.DISCONNECTED;
      }

      await admin.fetchTopicMetadata();

      return KafkaStatus.CONNECTED;
    } catch (error) {
      return error.toString() ?? KafkaStatus.DISCONNECTED;
    }
  }

  private getAmin(): Admin | null {
    if (!this.admin) {
      try {
        this.admin = this.server.unwrap()[0].admin(this.options?.retry ? { retry: this.options?.retry } : undefined);
      } catch {
        return null;
      }
    }

    return this.admin;
  }
}
