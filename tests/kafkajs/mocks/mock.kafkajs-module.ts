import { MockKafka } from '../mock.kafka';

/**
 * Фабрика мока модуля 'kafkajs'.
 *
 * Вариант 1 (только Kafka class):
 *   import { KAFKAJS_MOCK } from 'tests/kafkajs';
 *   jest.mock('kafkajs', () => jest.requireActual('tests/kafkajs').KAFKAJS_MOCK);
 *
 * Вариант 2 (с оригинальными экспортами):
 *   import { KAFKAJS_MOCK_WITH_ORIGINALS } from 'tests/kafkajs';
 *   jest.mock('kafkajs', () => jest.requireActual('tests/kafkajs').KAFKAJS_MOCK_WITH_ORIGINALS);
 */
export const KAFKAJS_MOCK = {
  Kafka: jest.fn((params?) => new MockKafka(params)),
};

export const KAFKAJS_MOCK_WITH_ORIGINALS = {
  ...jest.requireActual('kafkajs'),
  ...KAFKAJS_MOCK,
};
