import { Column, Model, DataType, Table } from 'sequelize-typescript';
import { IUser } from '../types/types';

@Table({
  tableName: 'users',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['name'],
      name: 'indx_users_name',
    },
  ],
})
export class UserModel extends Model<IUser> implements IUser {
  @Column({
    primaryKey: true,
    unique: true,
    autoIncrement: true,
    allowNull: false,
    type: DataType.BIGINT,
  })
  declare id?: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare createdAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare updatedAt: Date;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare name: string;
}
