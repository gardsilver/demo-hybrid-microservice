/**
 * Централизованный мок для модуля 'fs'.
 *
 * Использование в spec-файле:
 *
 *   import { FS_MOCK } from 'tests/fs';
 *   jest.mock('fs', () => ({ ...jest.requireActual('fs'), ...FS_MOCK }));
 *
 * После этого FS_MOCK содержит jest-моки: existsSync, openSync, appendFileSync и т.д.
 */
export const FS_MOCK = {
  existsSync: jest.fn(),
  appendFileSync: jest.fn(),
  openSync: jest.fn(() => 1002),
  writeSync: jest.fn(),
  closeSync: jest.fn(),
};
