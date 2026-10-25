import { mockSequelize } from '../index';

const actualSequelizeTypescript = jest.requireActual<typeof import('sequelize-typescript')>('sequelize-typescript');

/**
 * Фабрика мока модуля 'sequelize-typescript'.
 *
 *   jest.mock('sequelize-typescript', () => jest.requireActual('tests/sequelize-typescript').SEQUELIZE_TYPESCRIPT_MOCK);
 */
export const SEQUELIZE_TYPESCRIPT_MOCK = {
  ...actualSequelizeTypescript,
  Sequelize: jest.fn(() => mockSequelize),
} as unknown as typeof import('sequelize-typescript');
