import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { GracefulShutdownService } from './graceful-shutdown.service';

@Injectable()
export class GracefulShutdownHealthIndicatorService {
  constructor(
    private readonly gracefulShutdownService: GracefulShutdownService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isReadiness(): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check('GracefulShutdown');

    if (this.gracefulShutdownService.isActive()) {
      return indicator.down({ isActive: true });
    }

    return indicator.up({ isActive: false });
  }
}
