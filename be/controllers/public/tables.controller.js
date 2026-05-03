const service = require("../../services/public/tableQr.service");

exports.getTableByToken = async (req, res) => {
  try {
    const table = await service.getTableByToken(req.params.token);
    if (!table) return res.status(404).json({ message: "Không tìm thấy bàn" });
    res.json(table);
  } catch (e) {
    console.error("getTableByToken error:", e);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.getBillByToken = async (req, res) => {
  try {
    const bill = await service.getBillByToken(req.params.token);
    if (!bill) return res.status(404).json({ message: "Không có bill cho bàn này" });
    res.json(bill);
  } catch (e) {
    console.error("getBillByToken error:", e);
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.checkinByToken = async (req, res) => {
  try {
    const userId = req.userId;
    const { number_of_guests } = req.body || {};
    const data = await service.checkinByToken({
      token: req.params.token,
      userId,
      numberOfGuests: number_of_guests,
    });
    res.status(201).json(data);
  } catch (e) {
    const map = {
      TABLE_NOT_FOUND: 404,
      TABLE_NOT_ACTIVE: 400,
      INVALID_GUESTS: 400,
    };
    res.status(map[e.message] || 500).json({ message: e.message });
  }
};

