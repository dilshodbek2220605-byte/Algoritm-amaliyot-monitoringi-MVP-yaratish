'use strict';

const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const COORDINATOR_EMAIL = process.env.SEED_COORDINATOR_EMAIL || 'coordinator@algoritm.uz';
const COORDINATOR_PASSWORD = process.env.SEED_COORDINATOR_PASSWORD || 'Coordinator123!';

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const passwordHash = await bcrypt.hash(COORDINATOR_PASSWORD, 12);
    const [existing] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = :email LIMIT 1',
      { replacements: { email: COORDINATOR_EMAIL }, type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (existing) {
      return;
    }

    await queryInterface.bulkInsert('users', [
      {
        id: randomUUID(),
        full_name: 'Bosh Koordinator',
        email: COORDINATOR_EMAIL,
        password_hash: passwordHash,
        role: 'coordinator',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { email: COORDINATOR_EMAIL });
  },
};
