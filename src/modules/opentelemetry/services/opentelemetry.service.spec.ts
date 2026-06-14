/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { OpentelemetryService } from './opentelemetry.service'; // Скорректируйте путь к файлу
import { OpentelemetryBuilder } from '../builders/opentelemetry.builder';

jest.mock('../builders/opentelemetry.builder', () => {
  return {
    OpentelemetryBuilder: {
      notUseHardShutdown: jest.fn(),
      shutdown: jest.fn().mockResolvedValue(undefined),
    },
  };
});

describe('OpentelemetryService', () => {
  let service: OpentelemetryService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Инициализируем сервис через DI-контейнер NestJS
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpentelemetryService],
    }).compile();

    service = module.get<OpentelemetryService>(OpentelemetryService);
  });

  it('должен быть определен', () => {
    expect(service).toBeDefined();
  });

  describe('Конструктор', () => {
    it('должен отключать жесткое системное завершение OpenTelemetry при создании инстанса', () => {
      // Конструктор вызывается автоматически при module.get() в beforeEach
      expect(OpentelemetryBuilder.notUseHardShutdown).toHaveBeenCalledTimes(1);
    });
  });

  describe('afterDestroy', () => {
    it('должен асинхронно вызывать метод выключения SDK у OpentelemetryBuilder', async () => {
      await service.afterDestroy();

      expect(OpentelemetryBuilder.shutdown).toHaveBeenCalledTimes(1);
    });

    it('должен корректно пробрасывать ошибку наружу, если метод shutdown завершился сбоем', async () => {
      const mockError = new Error('Shutdown error');
      (OpentelemetryBuilder.shutdown as jest.Mock).mockRejectedValueOnce(mockError);

      await expect(service.afterDestroy()).rejects.toThrow('Shutdown error');
    });
  });
});
