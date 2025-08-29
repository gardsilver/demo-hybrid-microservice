import { Injectable } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfig {
  private servicePort: string;
  private grpcHost: string;
  private grpcPort: string;
  private corsOptions: string;

  constructor(private readonly configService: ConfigService) {
    this.servicePort = this.configService.get<string>('SERVICE_PORT', '3000').trim();
    this.grpcHost = this.configService.get<string>('GRPC_HOST', '').trim();
    this.grpcPort = this.configService.get<string>('GRPC_PORT', '').trim();
    this.corsOptions = this.configService.get<string>('CORS_OPTIONS', '{"origin":"*"}').trim();
  }

  getServicePort(): number {
    return Number(this.servicePort);
  }

  getGrpcHost(): string {
    return this.grpcHost === '' ? '0.0.0.0' : this.grpcHost;
  }

  getGrpcPort(): number {
    return Number(this.grpcPort);
  }

  getCorsOptions(): CorsOptions {
    return this.corsOptions ? JSON.parse(this.corsOptions) : undefined;
  }
}
