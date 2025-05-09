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
    res.json([
      { id: 1, name: "Chi nhánh Hà Nội", address: "123 Trần Duy Hưng, Cầu Giấy, Hà Nội" },
      { id: 2, name: "Chi nhánh TP.HCM", address: "456 Nguyễn Trãi, Quận 5, TP.HCM" },
    ]);
  };
  