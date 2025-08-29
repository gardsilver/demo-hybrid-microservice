'use strict';
const { DataTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        'users', 
        {
          id : {
            type: DataTypes.BIGINT,
            unique: true,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            comment: 'primaryKey',
          },
          createdAt: {
            field: 'created_at',
            type: DataTypes.DATE,
            allowNull: false,
            comment: 'Дата создания записи'
          },
          updatedAt: {
            field: 'updated_at',
            type: DataTypes.DATE,
            allowNull: false,
            comment: 'Дата изменения записи'
          },
          name: {
            type: DataTypes.STRING({ length: 64 }),
            allowNull: false,
            comment: 'Имя'
          }
        }, 
        {
          transaction,
          comment: 'Таблица пользователей'
        }
      );

      await queryInterface.addIndex('users', ['name'], {
        name: 'indx_users_name',
        unique: true,
        transaction,
      });


      transaction.commit();
    } catch (e) {
      transaction.rollback();

      throw e;
    }
  },

  async down (queryInterface, sequelize) {
    throw new Error('Откат миграции запрещен')
  }
};
