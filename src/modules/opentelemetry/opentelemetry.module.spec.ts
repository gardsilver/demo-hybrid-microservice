import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { OpentelemetryModule } from './opentelemetry.module';
import { OpentelemetryService } from './services/opentelemetry.service';
import { MockConfigService } from 'tests/nestjs';
import { OpentelemetryConfig } from './services/opentelemetry.config';

jest.mock('./services/opentelemetry.service', () => {
  return {
    OpentelemetryService: jest.fn().mockImplementation(() => ({})),
  };
});

jest.mock('./services/opentelemetry.config', () => {
  return {
    OpentelemetryConfig: jest.fn().mockImplementation(() => ({})),
  };
});

describe('OpentelemetryModule', () => {
  let testingModule: TestingModule;

  beforeEach(async () => {
    jest.clearAllMocks();

    testingModule = await Test.createTestingModule({
      imports: [OpentelemetryModule],
      providers: [
        {
          provide: ConfigService,
          useValue: new MockConfigService({}),
        },
      ],
    }).compile();
  });

  it('модуль должен успешно компилироваться DI-контейнером NestJS', () => {
    const moduleInstance = testingModule.get<OpentelemetryModule>(OpentelemetryModule);
    expect(moduleInstance).toBeDefined();
  });

  it('должен содержать зарегистрированный провайдер OpentelemetryService', () => {
    const serviceInstance = testingModule.get<OpentelemetryService>(OpentelemetryService);
    expect(serviceInstance).toBeDefined();
    expect(OpentelemetryService).toHaveBeenCalled();
  });

  it('должен содержать зарегистрированный провайдер OpentelemetryConfig', () => {
    const serviceInstance = testingModule.get<OpentelemetryConfig>(OpentelemetryConfig);
    expect(serviceInstance).toBeDefined();
    expect(OpentelemetryConfig).toHaveBeenCalled();
  });
});
