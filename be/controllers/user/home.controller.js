const db = require("../../models/db");
const { Sequelize } = require("sequelize");

const Branch = db.Branch;

// Ví dụ dữ liệu mock
exports.getFeaturedDishes = async (req, res) => {
    res.json([
      { id: 1, name: "Bò lúc lắc", image: "/images/bo-luc-lac.jpg", price: 120000 },
      { id: 2, name: "Tôm hấp bia", image: "/images/tom-hap.jpg", price: 150000 },
    ]);
  };
  
  exports.getMenuCategories = async (req, res) => {
    res.json([
      { id: 1, name: "Khai vị" },
      { id: 2, name: "Món chính" },
      { id: 3, name: "Tráng miệng" },
    ]);
  };
  
  exports.getIntroduction = async (req, res) => {
    res.json({
      title: "Nhà hàng Hương Quê – Nơi hương vị quê hương thăng hoa",
      content: "Với hơn 10 năm kinh nghiệm, chúng tôi phục vụ các món ăn truyền thống với nguyên liệu tươi sạch."
    });
  };
  
  exports.getBranches = async (req, res) => {
    try {
      const branches = await Branch.findAll({
        attributes: [
          "branch_id",
          "name",
          "address",
          "phone",
          "open_time",
          "close_time",
          "image_url",
          "is_active",
          [
            Sequelize.literal(`(
              SELECT COUNT(*)
              FROM tables t
              WHERE t.branch_id = "Branch"."branch_id"
            )`),
            "total_tables",
          ],
          [
            Sequelize.literal(`(
              SELECT COUNT(*)
              FROM tables t
              WHERE t.branch_id = "Branch"."branch_id"
                AND t.status = 'available'
            )`),
            "available_tables",
          ],
        ],
        order: [["branch_id", "ASC"]],
      });

      res.json(branches);
    } catch (error) {
      console.error("Lỗi getBranches:", error);
      res.status(500).json({ message: "Không thể tải danh sách chi nhánh" });
    }
  };
  
