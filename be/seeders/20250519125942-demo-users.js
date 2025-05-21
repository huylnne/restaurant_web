const { faker } = require("@faker-js/faker");

const roles = ["admin", "waiter", "kitchen", "manager", "user"];

module.exports = {
  async up(queryInterface, Sequelize) {
    const users = [];

    for (let i = 1; i <= 100; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      users.push({
        username: `user${i}`,
        password_hash: "123456", // chưa hash
        role: roles[Math.floor(Math.random() * roles.length)],
        full_name: `${firstName} ${lastName}`,
        phone: faker.phone.number("09########"),
        created_at: new Date(),
        avatar_url: faker.image.avatar(),
        branch_id: 1
      });
    }

    await queryInterface.bulkInsert("users", users);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("users", null, {});
  }
};
