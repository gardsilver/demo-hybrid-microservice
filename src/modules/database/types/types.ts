import { QueryInterface } from 'sequelize';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';

export interface IModelConfig
  extends Partial<Pick<SequelizeOptions, 'models' | 'modelPaths' | 'modelMatch' | 'repositoryMode' | 'validateOnly'>> {}

export interface IMigration {
  up(queryInterface: QueryInterface, sequelize?: Sequelize): Promise<void> | Promise<never>;
  down(queryInterface: QueryInterface, sequelize?: Sequelize): Promise<void> | Promise<never>;
}
