/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpGeneralAsyncContextHeaderNames } from 'src/modules/http/http-common';
import { KafkaAsyncContextHeaderNames } from 'src/modules/kafka/kafka-common';
import { kafkaHeadersFactory } from './kafka.headers.factory';

jest.mock('tests/modules/http/http-common', () => {
  return {
    __esModule: true,
    httpHeadersFactory: {
      build: jest.fn().mockImplementation((params, options) => {
        return {
          [HttpGeneralAsyncContextHeaderNames.TRACE_ID]: options?.transient?.traceId || 'default-trace-id',
          [HttpGeneralAsyncContextHeaderNames.SPAN_ID]: options?.transient?.spanId || 'default-span-id',
          ...params,
        };
      }),
    },
  };
});

describe('kafkaHeadersFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('должен генерировать базовые HTTP заголовки трассировки по умолчанию, если transientParams пустой', () => {
    const result = kafkaHeadersFactory.build();

    expect(result[HttpGeneralAsyncContextHeaderNames.TRACE_ID]).toBe('default-trace-id');
    expect(result[HttpGeneralAsyncContextHeaderNames.SPAN_ID]).toBe('default-span-id');
    expect(result[KafkaAsyncContextHeaderNames.REPLY_TOPIC]).toBeUndefined();
    expect(result[KafkaAsyncContextHeaderNames.REPLY_PARTITION]).toBeUndefined();
  });

  it('должен успешно добавлять replyTopic и replyPartition, если они переданы в transientParams', () => {
    const mockReplyTopic = 'TestResponseTopic';
    const mockReplyPartition = 3;

    const result = kafkaHeadersFactory.build(
      {},
      {
        transient: {
          replyTopic: mockReplyTopic,
          replyPartition: mockReplyPartition,
          traceId: 'custom-trace-id',
        } as any,
      },
    );

    expect(result[HttpGeneralAsyncContextHeaderNames.TRACE_ID]).toBe('custom-trace-id');
    expect(result[KafkaAsyncContextHeaderNames.REPLY_TOPIC]).toBe(mockReplyTopic);
    expect(result[KafkaAsyncContextHeaderNames.REPLY_PARTITION]).toBe('3'); // Должно преобразоваться в строку
  });

  it('должен генерировать случайные значения для replyTopic и replyPartition, если ключи переданы со значением undefined', () => {
    const result = kafkaHeadersFactory.build(
      {},
      {
        transient: {
          replyTopic: undefined,
          replyPartition: undefined,
        } as any,
      },
    );

    expect(result[KafkaAsyncContextHeaderNames.REPLY_TOPIC]).toBeDefined();
    expect(typeof result[KafkaAsyncContextHeaderNames.REPLY_TOPIC]).toBe('string');
    expect(result[KafkaAsyncContextHeaderNames.REPLY_PARTITION]).toBeDefined();
    expect(typeof result[KafkaAsyncContextHeaderNames.REPLY_PARTITION]).toBe('string');
  });

  it('должен преобразовывать строковые заголовки в массивы (разбивая по дефису), если передан флаг asArray: true', () => {
    const mockReplyTopicWithDashes = 'reply-topic-with-multiple-dashes';
    const mockReplyPartition = '2-4';

    const result = kafkaHeadersFactory.build(
      {},
      {
        transient: {
          replyTopic: mockReplyTopicWithDashes,
          replyPartition: mockReplyPartition,
          asArray: true,
        } as any,
      },
    );

    expect(result[KafkaAsyncContextHeaderNames.REPLY_TOPIC]).toEqual(['reply', 'topic', 'with', 'multiple', 'dashes']);

    expect(result[KafkaAsyncContextHeaderNames.REPLY_PARTITION]).toEqual(['2', '4']);
  });
});
