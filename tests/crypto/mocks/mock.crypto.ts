import { faker } from '@faker-js/faker';
/**
 * Централизованный мок для модуля 'crypto'.
 *
 * Использование в spec-файле:
 *
 *   import { CRYPTO_MOCK } from 'tests/crypto';
 *   jest.mock('crypto', () => ({ ...jest.requireActual('crypto'), ...jest.requireActual('tests/crypto').CRYPTO_MOCK }));
 */
export const CRYPTO_MOCK = {
  randomUUID: jest.fn().mockImplementation(() => faker.string.uuid()),
  randomBytes: jest
    .fn()
    .mockImplementation((size: number) =>
      Buffer.from(faker.string.hexadecimal({ length: 2 * size, casing: 'lower', prefix: '' }), 'hex'),
    ),
};
