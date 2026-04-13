/**
 * Фабрика мока модуля 'amqp-connection-manager'.
 *
 *   import { AMQP_CONNECTION_MANAGER_MOCK } from 'tests/amqp-connection-manager';
 *   jest.mock('amqp-connection-manager', () => jest.requireActual('tests/amqp-connection-manager').AMQP_CONNECTION_MANAGER_MOCK);
 *
 * Для динамической подмены connect() используйте mockConnect:
 *   AMQP_CONNECTION_MANAGER_MOCK.connect.mockImplementation(() => ...);
 */
export const AMQP_CONNECTION_MANAGER_MOCK = {
  ...jest.requireActual('amqp-connection-manager'),
  connect: jest.fn(),
};
