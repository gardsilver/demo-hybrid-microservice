import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrometheusConfig {
  private applicationName: string;
  private microserviceName: string;
  private microserviceVersion: string;

  constructor(configService: ConfigService) {
    this.applicationName = configService.get<string>('APPLICATION_NAME');
    this.microserviceName = configService.get<string>('MICROSERVICE_NAME');
    this.microserviceVersion = configService.get<string>('MICROSERVICE_VERSION');
  }

  getApplicationName(): string {
    return this.applicationName;
  }

  getMicroserviceName(): string {
    return this.microserviceName;
  }

  getMicroserviceVersion(): string {
    return this.microserviceVersion;
  }
}
