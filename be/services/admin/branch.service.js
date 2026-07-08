/**
 * SERVICE ADMIN BRANCH — logic quản lý chi nhánh, giờ mở cửa, trạng thái hoạt động.
 * Ctrl+F: branch service, listBranches, createBranch, updateMyBranch
 * Luồng demo: Phần 5 — quản lý chi nhánh và manager chi nhánh.
 */
const db = require("../../models/db");

const Branch = db.Branch;
const User = db.User;

/** [CHI NHÁNH] Các field được phép update, tránh ghi nhầm field hệ thống. Ctrl+F: MUTABLE_FIELDS */
const MUTABLE_FIELDS = [
  "name",
  "address",
  "phone",
  "open_time",
  "close_time",
  "image_url",
  "latitude",
  "longitude",
  "is_active",
];

/** [CHI NHÁNH] Lọc payload update chỉ giữ field hợp lệ. Ctrl+F: sanitizePayload branch */
function sanitizePayload(payload = {}) {
  // Chỉ copy các field nằm trong whitelist MUTABLE_FIELDS → chặn client ghi đè field hệ thống (vd branch_id, created_at).
  const clean = {};
  for (const key of MUTABLE_FIELDS) {
    if (payload[key] !== undefined) {
      clean[key] = payload[key];
    }
  }
  return clean;
}

/** [CHI NHÁNH] Danh sách toàn bộ chi nhánh cho super admin. Ctrl+F: listBranches */
async function listBranches() {
  return Branch.findAll({
    order: [["branch_id", "ASC"]],
  });
}

/** [CHI NHÁNH] Chi tiết chi nhánh theo id. Ctrl+F: getBranchById service */
async function getBranchById(branchId) {
  return Branch.findByPk(branchId);
}

/** [CHI NHÁNH] Tạo chi nhánh mới, bắt buộc name/address. Ctrl+F: createBranch service */
async function createBranch(data) {
  if (!data.name || !data.address) {
    throw new Error("Tên và địa chỉ chi nhánh là bắt buộc");
  }
  return Branch.create({
    name: data.name,
    address: data.address,
    phone: data.phone || null,
    open_time: data.open_time || null,
    close_time: data.close_time || null,
    image_url: data.image_url || null,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    is_active: data.is_active !== undefined ? !!data.is_active : true,
  });
}

/** [CHI NHÁNH] Cập nhật thông tin vận hành chi nhánh. Ctrl+F: updateBranch service */
async function updateBranch(branchId, data) {
  const branch = await Branch.findByPk(branchId);
  if (!branch) throw new Error("Không tìm thấy chi nhánh");

  const payload = sanitizePayload(data);
  await branch.update(payload);
  return branch;
}

/** [CHI NHÁNH] Tạm ngưng chi nhánh bằng is_active=false. Ctrl+F: deactivateBranch service */
async function deactivateBranch(branchId) {
  const branch = await Branch.findByPk(branchId);
  if (!branch) throw new Error("Không tìm thấy chi nhánh");
  await branch.update({ is_active: false });
  return { message: "Đã vô hiệu hóa chi nhánh", branch_id: branchId };
}

/** [MANAGER] Lấy chi nhánh manager đang phụ trách theo users.branch_id. Ctrl+F: getBranchByManager */
async function getBranchByManager(userId) {
  const manager = await User.findByPk(userId, {
    attributes: ["user_id", "role", "branch_id"],
  });
  if (!manager || !manager.branch_id) {
    throw new Error("Tài khoản chưa được gán chi nhánh");
  }
  const branch = await Branch.findByPk(manager.branch_id);
  if (!branch) throw new Error("Không tìm thấy chi nhánh");
  return branch;
}

/** [MANAGER] Manager cập nhật chi nhánh của mình, không được đổi branch khác. Ctrl+F: updateMyBranch service */
async function updateMyBranch(userId, data) {
  const branch = await getBranchByManager(userId);
  const payload = sanitizePayload(data);
  await branch.update(payload);
  return branch;
}

module.exports = {
  listBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deactivateBranch,
  getBranchByManager,
  updateMyBranch,
};
