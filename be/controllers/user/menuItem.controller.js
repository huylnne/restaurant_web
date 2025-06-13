const db = require("../../models/db"); // hoặc đúng path bạn đã dùng
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
      // Lấy query params: ?page=1&limit=8
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 8;
      const offset = (page - 1) * limit;
  
      const { count, rows } = await MenuItem.findAndCountAll({
        where: { is_active: true }, // chỉ lấy món đang hoạt động
        limit,
        offset,
        order: [['created_at', 'DESC']]
      });
  
      res.json({
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        items: rows
      });
    } catch (error) {
      console.error("❌ Lỗi khi lấy danh sách món ăn:", error);
      res.status(500).json({ message: "Lỗi server" });
    }
  };
  
  
  module.exports = {
    getFeaturedMenuItems,
    getAllMenuItems,
  };
  
