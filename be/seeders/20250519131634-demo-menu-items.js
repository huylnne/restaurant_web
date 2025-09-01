// seeders/20250521-menu-items.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const items = [
      {
        branch_id: 1,
        name: "Cơm gà xối mỡ",
        description: "Cơm trắng ăn kèm đùi gà chiên giòn rưới mỡ hành",
        price: 45000,
        category: "Món chính",
        is_active: true,
        is_featured: true,
        created_at: now,
        image_url: "https://www.lacademie.com/wp-content/uploads/2023/01/fried-chicken-with-rice-recipe.jpg"
      },
      {
        branch_id: 1,
        name: "Canh chua cá lóc",
        description: "Canh chua miền Tây nấu với cá lóc, bạc hà, cà chua, me",
        price: 55000,
        category: "Món chính",
        is_active: true,
        is_featured: false,
        created_at: now,
        image_url: "https://cookbeo.com/media/2020/05/895368695/mon-canh-chua-ca-loc.jpg"
      },
      {
        branch_id: 1,
        name: "Gỏi cuốn tôm thịt",
        description: "Món khai vị truyền thống gồm tôm, thịt, rau sống cuộn bánh tráng",
        price: 30000,
        category: "Khai vị",
        is_active: true,
        is_featured: true,
        created_at: now,
        image_url: "https://tse3.mm.bing.net/th?id=OIP.AUbmvdDU0u1g4ZnOaTy41QHaHa&pid=Api&P=0&h=220"
      },
      {
        branch_id: 1,
        name: "Đùi gà quay",
        description: "",
        price: 50000,
        category: "Món chính",
        is_active: true,
        is_featured: false,
        created_at: now,
        image_url: "https://i.ytimg.com/vi/xPf-JwFseGM/maxresdefault.jpg"
      },
      {
        branch_id: 1,
        name: "Súp gà ngô nấm",
        description: "",
        price: 20000,
        category: "Món chính",
        is_active: true,
        is_featured: false,
        created_at: now,
        image_url: "https://cdn-i.vtcnews.vn/upload/2023/03/27/supgangonamthanhmatboduong-12231396.jpg"
      },
      {
        branch_id: 1,
        name: "Tôm rang muối",
        description: "Món tráng miệng ngọt thanh, giải nhiệt",
        price: 20000,
        category: "Món chính",
        is_active: true,
        is_featured: false,
        created_at: now,
        image_url: "https://i.ytimg.com/vi/dEcyGLLOxaQ/maxresdefault.jpg"
      },
      {
        branch_id: 1,
        name: "Salad rau củ",
        description: "",
        price: 20000,
        category: "Tráng miệng",
        is_active: true,
        is_featured: false,
        created_at: now,
        image_url: "https://tse3.mm.bing.net/th/id/OIP.WN8M1Q5SKHVBiYjE4rfYSAHaFP?pid=Api&P=0&h=220"
      },
      {
        branch_id: 1,
        name: "Mực chiên bơ",
        description: "",
        price: 20000,
        category: "Món chính",
        is_active: true,
        is_featured: true,
        created_at: now,
        image_url: "https://caophatfood.vn/wp-content/uploads/2021/10/muc-ong-chien-bo-toi.jpg"
      },
      {
        branch_id: 1,
        name: "Mực xào thập cẩm",
        description: "",
        price: 20000,
        category: "Món chính",
        is_active: true,
        is_featured: true,
        created_at: now,
        image_url: "https://tse1.mm.bing.net/th/id/OIP.s-AsujHNqJuntQHYsB6m3wHaEK?pid=Api&P=0&h=220"
      },
      {
        branch_id: 1,
        name: "Mực xào thập cẩm",
        description: "",
        price: 20000,
        category: "Món chính",
        is_active: true,
        is_featured: true,
        created_at: now,
        image_url: "https://tse1.mm.bing.net/th/id/OIP.s-AsujHNqJuntQHYsB6m3wHaEK?pid=Api&P=0&h=220"
      },
      {
        branch_id: 1,
        name: "Mực xào thập cẩm",
        description: "",
        price: 20000,
        category: "Món chính",
        is_active: true,
        is_featured: true,
        created_at: now,
        image_url: "https://tse1.mm.bing.net/th/id/OIP.s-AsujHNqJuntQHYsB6m3wHaEK?pid=Api&P=0&h=220"
      },
      {
        branch_id: 1,
        name: "Trà đào cam sả",
        description: "Thức uống mát lạnh với đào, cam và sả thơm",
        price: 35000,
        category: "Đồ uống",
        is_active: true,
        is_featured: true,
        created_at: now,
        image_url: "https://tse1.mm.bing.net/th/id/OIP.grYf_ksF6lhaNp4Jq7WWswHaHa?pid=Api&P=0&h=220"
      }
    ];

    await queryInterface.bulkDelete('menu_items', { branch_id: 1 });
    await queryInterface.bulkInsert('menu_items', items, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('menu_items', { branch_id: 1 });
  }
};
