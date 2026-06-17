/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
import { ArgumentsHost } from '@nestjs/common';
import { KafkaContext } from '../ctx-host/kafka.context';
import { KafkaServerHelper } from './kafka-server.helper';

describe('KafkaServerHelper.isKafka', () => {
  let mockContext: jest.Mocked<ArgumentsHost>;
  let mockKafkaContextInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockKafkaContextInstance = Object.create(KafkaContext.prototype);

    mockContext = {
      getType: jest.fn().mockReturnValue('rpc'),
      switchToRpc: jest.fn().mockReturnValue({
        getContext: jest.fn().mockImplementation(() => mockKafkaContextInstance),
      }),
    } as unknown as jest.Mocked<ArgumentsHost>;
  });

  it('должен успешно вернуть true, если тип транспорта равен "rpc" и контекст является инстансом KafkaContext', () => {
    const result = KafkaServerHelper.isKafka(mockContext);

    expect(result).toBe(true);
    expect(mockContext.getType).toHaveBeenCalledTimes(1);
    expect(mockContext.switchToRpc).toHaveBeenCalledTimes(1);
  });

  it('должен мгновенно вернуть false, если тип контекста NestJS отличается от "rpc" (например, "http" или "ws")', () => {
    mockContext.getType.mockReturnValueOnce('http');

    const result = KafkaServerHelper.isKafka(mockContext);

    expect(result).toBe(false);
    expect(mockContext.switchToRpc).not.toHaveBeenCalled();
  });

  it('должен вернуть false, если тип равен "rpc", но внутри находится контекст другого брокера (например, RabbitMqContext или плоский объект)', () => {
    mockContext.switchToRpc.mockReturnValueOnce({
      getContext: jest.fn().mockReturnValue({ pattern: 'kafka-topic-test', data: {} }),
    } as any);

    const result = KafkaServerHelper.isKafka(mockContext);

    expect(result).toBe(false);
    expect(mockContext.getType).toHaveBeenCalledTimes(1);
  });

  it('должен вернуть false, если метод getContext() вернул пустой результат (null или undefined)', () => {
    mockContext.switchToRpc.mockReturnValueOnce({
      getContext: jest.fn().mockReturnValue(null),
    } as any);

    const result = KafkaServerHelper.isKafka(mockContext);

    expect(result).toBe(false);
  });
});
