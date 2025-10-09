import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfig } from './services/app.config';
import { AppKafkaConfig } from './services/app.kafka.config';

@Module({
  imports: [ConfigModule],
  providers: [AppConfig, AppKafkaConfig],
  exports: [AppConfig, AppKafkaConfig],
})
export class AppModule {}
