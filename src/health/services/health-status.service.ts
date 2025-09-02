import { HealthImplementation } from 'grpc-health-check';
import { Injectable } from '@nestjs/common';
import { GracefulShutdownEvents, GracefulShutdownOnEvent } from 'src/modules/graceful-shutdown';

@Injectable()
export class HealthStatusService {
  private grpcHealthImpl: HealthImplementation;
  private grpcServices: string[];

  public addGrpcHealthImplementation(grpcHealthImplementation: HealthImplementation, services: string[]): this {
    this.grpcHealthImpl = grpcHealthImplementation;
    this.grpcServices = services;

    return this;
  }

  @GracefulShutdownOnEvent({
    event: GracefulShutdownEvents.BEFORE_DESTROY,
  })
  public beforeDestroy() {
    if (this.grpcHealthImpl && this.grpcServices?.length) {
      this.grpcServices.forEach((service) => {
        this.grpcHealthImpl.setStatus(service, 'NOT_SERVING');
      });
    }
  }
}
