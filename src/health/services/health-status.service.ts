import { HealthImplementation } from 'grpc-health-check';
import { Injectable } from '@nestjs/common';
import { GracefulShutdownEvents, GracefulShutdownOnEvent } from 'src/modules/graceful-shutdown';

@Injectable()
export class HealthStatusService {
  private healthImplementations: Array<{
    grpcHealthImpl: HealthImplementation;
    grpcServices: string[];
  }> = [];

  public addGrpcHealthImplementation(grpcHealthImplementation: HealthImplementation, services: string[]): this {
    this.healthImplementations.push({
      grpcHealthImpl: grpcHealthImplementation,
      grpcServices: services,
    });

    return this;
  }

  @GracefulShutdownOnEvent({
    event: GracefulShutdownEvents.BEFORE_DESTROY,
  })
  public beforeDestroy() {
    this.healthImplementations.forEach((params) => {
      if (params.grpcHealthImpl && params.grpcServices?.length) {
        params.grpcServices.forEach((service) => {
          params.grpcHealthImpl.setStatus(service, 'NOT_SERVING');
        });
      }
    });
  }
}
