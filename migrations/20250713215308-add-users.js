'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const current = new Date();

      await queryInterface.bulkInsert(
        'users',[
          {
            name: 'Петр',
            created_at: current,
            updated_at: current,
          }, {
            name: 'Мария',
            created_at: current,
            updated_at: current,
          }
        ],
        {
          transaction,
        }
      );

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
