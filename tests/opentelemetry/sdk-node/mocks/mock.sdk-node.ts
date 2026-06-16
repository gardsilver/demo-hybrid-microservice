/**
 * Централизованный мок для модуля '@opentelemetry/sdk-node'.
 *
 * Использование в spec-файле:
 *
 *   import { OPENTELEMETRY_SDK_NODE_MOCK } from 'tests/opentelemetry';
 *   jest.mock('@opentelemetry/sdk-node', () => ({ ...jest.requireActual('@opentelemetry/sdk-node'), ...jest.requireActual('tests/opentelemetry').OPENTELEMETRY_SDK_NODE_MOCK }));
 */

export const OPENTELEMETRY_SDK_NODE_MOCK = {
  NodeSDK: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    shutdown: jest.fn().mockResolvedValue(undefined),
  })),
};
