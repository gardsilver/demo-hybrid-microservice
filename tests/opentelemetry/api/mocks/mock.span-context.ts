/**
 * Централизованный мок для модуля '@opentelemetry/api'.
 *
 * Использование в spec-файле:
 *
 *   import { OPENTELEMETRY_API_MOCK } from 'tests/opentelemetry';
 *   jest.mock('@opentelemetry/api', () => ({ ...jest.requireActual('@opentelemetry/api'), ...jest.requireActual('tests/opentelemetry').OPENTELEMETRY_API_MOCK }));
 */

export const OPENTELEMETRY_API_MOCK = {
  trace: {
    getSpanContext: jest.fn(),
  },
  context: {
    active: jest.fn(),
  },
};
