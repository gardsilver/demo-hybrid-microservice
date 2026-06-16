import { Module } from '@nestjs/common';
import { OpentelemetryService } from './services/opentelemetry.service';

@Module({
  providers: [OpentelemetryService],
})
export class OpentelemetryModule {}
