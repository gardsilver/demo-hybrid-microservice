/**
 * Централизованный мок для модуля 'crypto'.
 *
 * Использование в spec-файле:
 *
 *   import { CRYPTO_MOCK } from 'tests/crypto';
 *   jest.mock('crypto', () => ({ ...jest.requireActual('crypto'), ...jest.requireActual('tests/crypto').CRYPTO_MOCK }));
 */
export const CRYPTO_MOCK = {
  randomUUID: jest.fn(),
};
