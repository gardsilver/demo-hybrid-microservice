import { mockSequelize } from '../index';

/**
 * Фабрика мока модуля 'sequelize-typescript'.
 *
 *   jest.mock('sequelize-typescript', () => jest.requireActual('tests/sequelize-typescript').SEQUELIZE_TYPESCRIPT_MOCK);
 */
export const SEQUELIZE_TYPESCRIPT_MOCK = {
  Sequelize: jest.fn(() => mockSequelize),
};
