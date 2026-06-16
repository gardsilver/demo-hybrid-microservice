import { Injectable } from '@nestjs/common';
import { GracefulShutdownEvents, GracefulShutdownOnEvent } from 'src/modules/graceful-shutdown';
import { OpentelemetryBuilder } from '../builders/opentelemetry.builder';

@Injectable()
export class OpentelemetryService {
  constructor() {
    OpentelemetryBuilder.notUseHardShutdown();
  }

  @GracefulShutdownOnEvent({
    event: GracefulShutdownEvents.AFTER_DESTROY,
  })
  async afterDestroy(): Promise<void> {
    await OpentelemetryBuilder.shutdown();
  }
}
