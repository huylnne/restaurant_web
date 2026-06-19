const db = require("../../models/db");
const MenuItem = db.MenuItem;
const {
  getHighlights: getMenuHighlightsData,
  formatMenuItem,
} = require("../../services/menuHighlight.service");

const getFeaturedMenuItems = async (req, res) => {
    try {
      const branch_id = parseInt(req.query.branch_id || req.query.branchId, 10) || 1;
      const featuredItems = await MenuItem.findAll({
        where: {
          branch_id,
          is_featured: true,
          is_available: true,
        },
      });
  

  
      res.json(featuredItems);
    } catch (error) {
      console.error("❌ Lỗi khi lấy món nổi bật:", error);
      res.status(500).json({ message: "Lỗi server" });
    }
  };


const getMenuHighlights = async (req, res) => {
  try {
    const branch_id = parseInt(req.query.branch_id || req.query.branchId, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 8;
    const days = parseInt(req.query.days, 10) || 30;
    const data = await getMenuHighlightsData(branch_id, { limit, days });
    res.json(data);
  } catch (error) {
    console.error("❌ Lỗi khi lấy gợi ý menu:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const getAllMenuItems = async (req, res) => {
  try {
    // Lấy query params: ?page=1&limit=8&category=starter
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const offset = (page - 1) * limit;
    const category = req.query.category;
    const branch_id = parseInt(req.query.branch_id || req.query.branchId, 10) || 1;

    // Tạo điều kiện filter
    const where = { is_available: true, branch_id };
    if (category) {
      where.category = category;
    }

    // Dùng đúng biến where ở đây!
    const { count, rows } = await MenuItem.findAndCountAll({
      where, // <-- SỬA CHỖ NÀY
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
      items: rows.map((row) => formatMenuItem(row.get({ plain: true }))),
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách món ăn:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
  
  
module.exports = {
  getFeaturedMenuItems,
  getMenuHighlights,
  getAllMenuItems,
};
  
