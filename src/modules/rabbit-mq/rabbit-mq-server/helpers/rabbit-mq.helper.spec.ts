/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { ArgumentsHost } from '@nestjs/common';
import { RabbitMqContext } from '../ctx-host/rabbit-mq.context'; // Скорректируйте относительный путь до контекста
import { RabbitMqHelper } from './rabbit-mq.helper';

describe('RabbitMqHelper.isRabbitMq', () => {
  let mockContext: jest.Mocked<ArgumentsHost>;
  let mockRabbitMqContextInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRabbitMqContextInstance = Object.create(RabbitMqContext.prototype);

    mockContext = {
      getType: jest.fn().mockReturnValue('rpc'),
      switchToRpc: jest.fn().mockReturnValue({
        getContext: jest.fn().mockImplementation(() => mockRabbitMqContextInstance),
      }),
    } as unknown as jest.Mocked<ArgumentsHost>;
  });

  it('должен вернуть true, если тип контекста равен "rpc" и внутри лежит инстанс RabbitMqContext', () => {
    const result = RabbitMqHelper.isRabbitMq(mockContext);

    expect(result).toBe(true);
    expect(mockContext.getType).toHaveBeenCalledTimes(1);
    expect(mockContext.switchToRpc).toHaveBeenCalledTimes(1);
  });

  it('должен вернуть false, если тип транспорта NestJS отличается от "rpc" (например, "http" или "ws")', () => {
    mockContext.getType.mockReturnValueOnce('http');

    const result = RabbitMqHelper.isRabbitMq(mockContext);

    expect(result).toBe(false);
    expect(mockContext.switchToRpc).not.toHaveBeenCalled();
  });

  it('должен вернуть false, если тип равен "rpc", но внутри лежит контекст другого брокера (например, KafkaContext или обычный объект)', () => {
    mockContext.switchToRpc.mockReturnValueOnce({
      getContext: jest.fn().mockReturnValue({ someKey: 'kafka-or-other-data' }),
    } as any);

    const result = RabbitMqHelper.isRabbitMq(mockContext);

    expect(result).toBe(false);
  });

  it('должен вернуть false, если getContext() вернул null или undefined', () => {
    mockContext.switchToRpc.mockReturnValueOnce({
      getContext: jest.fn().mockReturnValue(null),
    } as any);

    const result = RabbitMqHelper.isRabbitMq(mockContext);

    expect(result).toBe(false);
  });
});
