'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // Bàn cho chi nhánh 2
    await queryInterface.bulkDelete('tables', { branch_id: 2 });
    const tables = [];
    for (let i = 1; i <= 30; i++) {
      tables.push({
        branch_id: 2,
        table_number: i,
        capacity: i % 5 === 0 ? 8 : i % 3 === 0 ? 6 : 4,
        status: 'available',
        created_at: now,
      });
    }
    await queryInterface.bulkInsert('tables', tables, {});

    // Menu cơ bản cho chi nhánh 2
    await queryInterface.bulkDelete('menu_items', { branch_id: 2 });
    await queryInterface.bulkInsert(
      'menu_items',
      [
        {
          branch_id: 2,
          name: 'Phở bò tái',
          description: 'Phở bò truyền thống nước dùng ninh xương',
          price: 65000,
          category: 'Món chính',
          is_active: true,
          is_featured: true,
          created_at: now,
          image_url: null,
        },
        {
          branch_id: 2,
          name: 'Bún chả Hà Nội',
          description: 'Bún chả nướng ăn kèm rau sống',
          price: 59000,
          category: 'Món chính',
          is_active: true,
          is_featured: true,
          created_at: now,
          image_url: null,
        },
        {
          branch_id: 2,
          name: 'Nem rán',
          description: 'Nem rán giòn truyền thống',
          price: 45000,
          category: 'Khai vị',
          is_active: true,
          is_featured: false,
          created_at: now,
          image_url: null,
        },
        {
          branch_id: 2,
          name: 'Trà chanh',
          description: 'Trà chanh tươi mát',
          price: 25000,
          category: 'Đồ uống',
          is_active: true,
          is_featured: false,
          created_at: now,
          image_url: null,
        },
        {
          branch_id: 2,
          name: 'Bò kho bánh mì',
          description: 'Bò kho mềm, đậm vị, ăn kèm bánh mì giòn',
          price: 69000,
          category: 'Món chính',
          is_active: true,
          is_featured: true,
          created_at: now,
          image_url: null,
        },
        {
          branch_id: 2,
          name: 'Cơm tấm sườn bì chả',
          description: 'Đĩa cơm tấm đầy đủ đặc trưng Sài Gòn',
          price: 62000,
          category: 'Món chính',
          is_active: true,
          is_featured: true,
          created_at: now,
          image_url: null,
        },
        {
          branch_id: 2,
          name: 'Bánh xèo miền Tây',
          description: 'Bánh xèo giòn rụm ăn kèm rau sống',
          price: 70000,
          category: 'Món chính',
          is_active: true,
          is_featured: false,
          created_at: now,
          image_url: null,
        },
        {
          branch_id: 2,
          name: 'Gà nướng mật ong',
          description: 'Gà nướng thơm mùi mật ong',
          price: 85000,
          category: 'Món chính',
          is_active: true,
          is_featured: true,
          created_at: now,
          image_url: null,
        },
        {
          branch_id: 2,
          name: 'Lẩu hải sản mini',
          description: 'Lẩu hải sản phần 2 người',
          price: 179000,
          category: 'Món chính',
          is_active: true,
          is_featured: false,
          created_at: now,
          image_url: null,
        },
        {
          branch_id: 2,
          name: 'Khoai tây chiên',
          description: 'Khai vị giòn ngon',
          price: 35000,
          category: 'Khai vị',
          is_active: true,
          is_featured: false,
          created_at: now,
          image_url: null,
        },
        {
          branch_id: 2,
          name: 'Nước cam ép',
          description: 'Cam tươi nguyên chất',
          price: 32000,
          category: 'Đồ uống',
          is_active: true,
          is_featured: false,
          created_at: now,
          image_url: null,
        },
        {
          branch_id: 2,
          name: 'Chè khúc bạch',
          description: 'Món tráng miệng thanh mát',
          price: 39000,
          category: 'Tráng miệng',
          is_active: true,
          is_featured: false,
          created_at: now,
          image_url: null,
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('menu_items', { branch_id: 2 });
    await queryInterface.bulkDelete('tables', { branch_id: 2 });
  },
};
