import { Module } from '@nestjs/common';
import { TestConfig } from './services/test.config';

@Module({
  providers: [TestConfig],
  exports: [TestConfig],
})
export class TestModule {}
