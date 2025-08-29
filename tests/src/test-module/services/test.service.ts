import { Injectable } from '@nestjs/common';
import { TestConfig } from './test.config';

@Injectable()
export class TestService {
  constructor(private readonly testConfig: TestConfig) {}

  getUrl(): string {
    return 'http://example.ru';
  }
}
