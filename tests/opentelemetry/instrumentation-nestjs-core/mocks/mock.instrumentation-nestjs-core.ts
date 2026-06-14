/**
 * Централизованный мок для модуля '@opentelemetry/instrumentation-nestjs-core'.
 *
 * Использование в spec-файле:
 *
 *   import { OPENTELEMETRY_INSTRUMENTATIONS_NESTJS_CORE_MOCK } from 'tests/opentelemetry';
 *   jest.mock('@opentelemetry/instrumentation-nestjs-core', () => ({ ...jest.requireActual('@opentelemetry/instrumentation-nestjs-core'), ...jest.requireActual('tests/opentelemetry').OPENTELEMETRY_INSTRUMENTATIONS_NESTJS_CORE_MOCK }));
 */

export const OPENTELEMETRY_INSTRUMENTATIONS_NESTJS_CORE_MOCK = {
  getNodeAutoInstrumentations: jest.fn().mockReturnValue({}),
};
