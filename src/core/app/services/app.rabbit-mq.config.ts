import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RmqUrl } from '@nestjs/microservices/external/rmq-url.interface';
import { ConfigServiceHelper } from 'src/modules/common';
import { RabbitMqFormatterHelper } from 'src/modules/rabbit-mq/rabbit-mq-common';

export interface RabbitMqRetryConfig {
  maxConnectionAttempts?: number;
  heartbeatIntervalInSeconds?: number;
  reconnectTimeInSeconds?: number;
}

@Injectable()
export class AppRabbitMqConfig {
  private urls: string[];
  private user: string;
  private pass: string;

  constructor(private readonly configService: ConfigService) {
    const configServiceHelper = new ConfigServiceHelper(configService, 'RABBIT_MQ_');

    this.urls = configServiceHelper.parseArray('URLS');
    this.user = this.configService.get<string>(configServiceHelper.getKeyName('USER'));
    this.pass = this.configService.get<string>(configServiceHelper.getKeyName('PASSWORD'));
  }

  getUrls(): RmqUrl[] {
    return this.urls.map((url) => {
      return {
        ...RabbitMqFormatterHelper.parseUrl(url),
        username: this.user,
        password: this.pass,
      };
    });
  }

  getUser(): string {
    return this.user;
  }

  getPass(): string {
    return this.pass;
  }

  getRetryConfig(): RabbitMqRetryConfig {
    return {
      heartbeatIntervalInSeconds: 5,
      reconnectTimeInSeconds: 10,
    };
  }
}
