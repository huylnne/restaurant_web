const db = require("../models/db"); // hoặc đúng path bạn đã dùng
const MenuItem = db.MenuItem;

const getFeaturedMenuItems = async (req, res) => {
    try {
      console.log("🟡 Gọi vào controller getFeaturedMenuItems");
  
      const featuredItems = await MenuItem.findAll({
        where: {
          is_featured: true,
          is_active: true,
        },
      });
  
      console.log("🎯 Dữ liệu trả về:", featuredItems);
  
      res.json(featuredItems);
    } catch (error) {
      console.error("❌ Lỗi khi lấy món nổi bật:", error);
      res.status(500).json({ message: "Lỗi server" });
    }
  };
  

module.exports = { getFeaturedMenuItems };
