import { Module } from '@nestjs/common';
import { OpentelemetryService } from './services/opentelemetry.service';
import { OpentelemetryConfig } from './services/opentelemetry.config';

@Module({
  providers: [OpentelemetryService, OpentelemetryConfig],
})
export class OpentelemetryModule {}
