/**
 * Централизованный мок для модуля '@opentelemetry/auto-instrumentations-node'.
 *
 * Использование в spec-файле:
 *
 *   import { OPENTELEMETRY_AUTO_INSTRUMENTATIONS_NODE_MOCK } from 'tests/opentelemetry';
 *   jest.mock('@opentelemetry/auto-instrumentations-node', () => ({ ...jest.requireActual('@opentelemetry/auto-instrumentations-node'), ...jest.requireActual('tests/opentelemetry').OPENTELEMETRY_AUTO_INSTRUMENTATIONS_NODE_MOCK }));
 */

export const OPENTELEMETRY_AUTO_INSTRUMENTATIONS_NODE_MOCK = {
  getNodeAutoInstrumentations: jest.fn().mockReturnValue({}),
};
