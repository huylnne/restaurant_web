const db = require("../models/db"); // hoặc đúng path bạn đã dùng
const MenuItem = db.MenuItem;

const getFeaturedMenuItems = async (req, res) => {
    try {

  
      const featuredItems = await MenuItem.findAll({
        where: {
          is_featured: true,
          is_active: true,
        },
      });
  

  
      res.json(featuredItems);
    } catch (error) {
      console.error("❌ Lỗi khi lấy món nổi bật:", error);
      res.status(500).json({ message: "Lỗi server" });
    }
  };


  const getAllMenuItems = async (req, res) => {
    try {
      const items = await MenuItem.findAll();
      res.json(items);
    } catch (error) {
      console.error("❌ Lỗi khi lấy danh sách món ăn:", error);
      res.status(500).json({ message: "Lỗi server" });
    }
  };
  
  module.exports = {
    getFeaturedMenuItems,
    getAllMenuItems,
  };
  
