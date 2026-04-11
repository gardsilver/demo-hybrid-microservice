/**
 * Централизованный мок для модуля 'prom-client'.
 *
 * Использование в spec-файле:
 *
 *   import { PROM_CLIENT_MOCK } from 'tests/prom-client';
 *   jest.mock('prom-client', () => ({ ...jest.requireActual('prom-client'), ...PROM_CLIENT_MOCK }));
 */
export const PROM_CLIENT_MOCK = {
  collectDefaultMetrics: jest.fn(),
};
