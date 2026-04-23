const db = require("../../models/db");

const Branch = db.Branch;
const User = db.User;

const MUTABLE_FIELDS = [
  "name",
  "address",
  "phone",
  "open_time",
  "close_time",
  "image_url",
  "is_active",
];

function sanitizePayload(payload = {}) {
  const clean = {};
  for (const key of MUTABLE_FIELDS) {
    if (payload[key] !== undefined) {
      clean[key] = payload[key];
    }
  }
  return clean;
}

async function listBranches() {
  return Branch.findAll({
    order: [["branch_id", "ASC"]],
  });
}

async function getBranchById(branchId) {
  return Branch.findByPk(branchId);
}

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
    is_active: data.is_active !== undefined ? !!data.is_active : true,
  });
}

async function updateBranch(branchId, data) {
  const branch = await Branch.findByPk(branchId);
  if (!branch) throw new Error("Không tìm thấy chi nhánh");

  const payload = sanitizePayload(data);
  await branch.update(payload);
  return branch;
}

async function deactivateBranch(branchId) {
  const branch = await Branch.findByPk(branchId);
  if (!branch) throw new Error("Không tìm thấy chi nhánh");
  await branch.update({ is_active: false });
  return { message: "Đã vô hiệu hóa chi nhánh", branch_id: branchId };
}

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
