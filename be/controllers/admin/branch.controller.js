const branchService = require("../../services/admin/branch.service");
const { isSuperAdmin } = require("../../utils/branchScope");

const toJSON = (m) => (m && typeof m.toJSON === "function" ? m.toJSON() : m);

exports.getBranches = async (req, res) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ message: "Chỉ super admin được xem toàn bộ chi nhánh" });
  try {
    const data = await branchService.listBranches();
    res.json(data.map(toJSON));
  } catch (error) {
    console.error("Lỗi getBranches:", error);
    res.status(500).json({ message: "Không thể tải danh sách chi nhánh" });
  }
};

exports.getBranchById = async (req, res) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ message: "Chỉ super admin được xem chi tiết chi nhánh này" });
  try {
    const branch = await branchService.getBranchById(req.params.id);
    if (!branch) return res.status(404).json({ message: "Không tìm thấy chi nhánh" });
    res.json(toJSON(branch));
  } catch (error) {
    console.error("Lỗi getBranchById:", error);
    res.status(500).json({ message: "Không thể tải chi tiết chi nhánh" });
  }
};

exports.createBranch = async (req, res) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ message: "Chỉ super admin được tạo chi nhánh" });
  try {
    const created = await branchService.createBranch(req.body);
    res.status(201).json(toJSON(created));
  } catch (error) {
    console.error("Lỗi createBranch:", error);
    res.status(400).json({ message: error.message || "Không thể tạo chi nhánh" });
  }
};

exports.updateBranch = async (req, res) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ message: "Chỉ super admin được cập nhật chi nhánh này" });
  try {
    const updated = await branchService.updateBranch(req.params.id, req.body);
    res.json(toJSON(updated));
  } catch (error) {
    console.error("Lỗi updateBranch:", error);
    res.status(400).json({ message: error.message || "Không thể cập nhật chi nhánh" });
  }
};

exports.deactivateBranch = async (req, res) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ message: "Chỉ super admin được vô hiệu hóa chi nhánh" });
  try {
    const result = await branchService.deactivateBranch(req.params.id);
    res.json(result);
  } catch (error) {
    console.error("Lỗi deactivateBranch:", error);
    res.status(400).json({ message: error.message || "Không thể vô hiệu hóa chi nhánh" });
  }
};

exports.getMyBranch = async (req, res) => {
  try {
    const branch = await branchService.getBranchByManager(req.userId);
    res.json(toJSON(branch));
  } catch (error) {
    console.error("Lỗi getMyBranch:", error);
    res.status(400).json({ message: error.message || "Không thể tải chi nhánh quản lý" });
  }
};

exports.updateMyBranch = async (req, res) => {
  try {
    const branch = await branchService.updateMyBranch(req.userId, req.body);
    res.json(toJSON(branch));
  } catch (error) {
    console.error("Lỗi updateMyBranch:", error);
    res.status(400).json({ message: error.message || "Không thể cập nhật chi nhánh" });
  }
};
