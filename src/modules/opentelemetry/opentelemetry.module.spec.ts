import { Test, TestingModule } from '@nestjs/testing';
import { OpentelemetryModule } from './opentelemetry.module';
import { OpentelemetryService } from './services/opentelemetry.service';

jest.mock('./services/opentelemetry.service', () => {
  return {
    OpentelemetryService: jest.fn().mockImplementation(() => ({})),
  };
});

describe('OpentelemetryModule', () => {
  let testingModule: TestingModule;

  beforeEach(async () => {
    jest.clearAllMocks();

    testingModule = await Test.createTestingModule({
      imports: [OpentelemetryModule],
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
});
