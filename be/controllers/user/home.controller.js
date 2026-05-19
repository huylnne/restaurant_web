const db = require("../../models/db");
const { Sequelize } = require("sequelize");
const { distanceKm, parseCoord, normalizeCoords } = require("../../utils/geo");

const Branch = db.Branch;

const BRANCH_LIST_ATTRIBUTES = [
  "branch_id",
  "name",
  "address",
  "phone",
  "open_time",
  "close_time",
  "image_url",
  "latitude",
  "longitude",
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
];

async function fetchBranchesWithStats() {
  return Branch.findAll({
    attributes: BRANCH_LIST_ATTRIBUTES,
    order: [["branch_id", "ASC"]],
  });
}

function branchToPlain(branch) {
  const row = branch.toJSON ? branch.toJSON() : branch;
  return {
    ...row,
    latitude: row.latitude != null ? parseFloat(row.latitude) : null,
    longitude: row.longitude != null ? parseFloat(row.longitude) : null,
  };
}

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
    title: "ABC Restaurant – Nơi hương vị tinh tế",
    content:
      "Chuỗi nhà hàng ABC Restaurant phục vụ ẩm thực Việt hiện đại với nguyên liệu tươi sạch tại Hà Nội, Đà Nẵng và TP.HCM.",
  });
};

exports.getBranches = async (req, res) => {
  try {
    const branches = await fetchBranchesWithStats();
    res.json(branches.map(branchToPlain));
  } catch (error) {
    console.error("Lỗi getBranches:", error);
    res.status(500).json({ message: "Không thể tải danh sách chi nhánh" });
  }
};

/** Sắp xếp chi nhánh theo khoảng cách từ vị trí khách (lat, lng) */
exports.getBranchesNearby = async (req, res) => {
  let lat = parseCoord(req.query.lat);
  let lng = parseCoord(req.query.lng);

  if (lat == null || lng == null) {
    return res.status(400).json({ message: "Cần tham số lat và lng hợp lệ" });
  }

  ({ lat, lng } = normalizeCoords(lat, lng));

  try {
    const rows = await fetchBranchesWithStats();
    const active = rows.map(branchToPlain).filter((b) => b.is_active !== false);

    const withDistance = active.map((b) => {
      const blat = b.latitude;
      const blng = b.longitude;
      const hasCoords = blat != null && blng != null;
      return {
        ...b,
        distance_km: hasCoords ? distanceKm(lat, lng, blat, blng) : null,
        has_coordinates: hasCoords,
      };
    });

    withDistance.sort((a, b) => {
      if (a.distance_km == null && b.distance_km == null) return a.branch_id - b.branch_id;
      if (a.distance_km == null) return 1;
      if (b.distance_km == null) return -1;
      return a.distance_km - b.distance_km;
    });

    res.json({
      user_location: { lat, lng },
      branches: withDistance,
    });
  } catch (error) {
    console.error("Lỗi getBranchesNearby:", error);
    res.status(500).json({ message: "Không thể tải chi nhánh gần bạn" });
  }
};
