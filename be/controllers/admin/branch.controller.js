/**
 * CONTROLLER ADMIN BRANCH — HTTP layer quản lý chi nhánh và chi nhánh manager phụ trách.
 * Ctrl+F: branch controller, getBranches, updateMyBranch, deactivateBranch
 * Luồng demo: Phần 5 — Bước 5.3 quản lý chi nhánh.
 */
const branchService = require("../../services/admin/branch.service");
const { isSuperAdmin } = require("../../utils/branchScope");

/** [RESPONSE] Chuyển Sequelize model sang plain object trước khi trả JSON. Ctrl+F: toJSON branch */
const toJSON = (m) => (m && typeof m.toJSON === "function" ? m.toJSON() : m);

/** [CHI NHÁNH] Super admin xem toàn bộ chi nhánh. Ctrl+F: getBranches */
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

/** [CHI NHÁNH] Super admin xem chi tiết một chi nhánh. Ctrl+F: getBranchById */
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

/** [CHI NHÁNH] Super admin tạo chi nhánh mới. Ctrl+F: createBranch */
exports.createBranch = async (req, res) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ message: "Chỉ super admin được tạo chi nhánh" });
  try {
    const created = await branchService.createBranch(req.body);
    const json = toJSON(created);
    req.audit = { entityId: json.branch_id, description: `Tạo chi nhánh #${json.branch_id}` };
    res.status(201).json(json);
  } catch (error) {
    console.error("Lỗi createBranch:", error);
    res.status(400).json({ message: error.message || "Không thể tạo chi nhánh" });
  }
};

/** [CHI NHÁNH] Super admin cập nhật chi nhánh bất kỳ. Ctrl+F: updateBranch */
exports.updateBranch = async (req, res) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ message: "Chỉ super admin được cập nhật chi nhánh này" });
  try {
    const updated = await branchService.updateBranch(req.params.id, req.body);
    const json = toJSON(updated);
    req.audit = { entityId: json.branch_id || req.params.id };
    res.json(json);
  } catch (error) {
    console.error("Lỗi updateBranch:", error);
    res.status(400).json({ message: error.message || "Không thể cập nhật chi nhánh" });
  }
};

/** [CHI NHÁNH] Vô hiệu hóa chi nhánh để không cho đặt bàn. Ctrl+F: deactivateBranch */
exports.deactivateBranch = async (req, res) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ message: "Chỉ super admin được vô hiệu hóa chi nhánh" });
  try {
    const result = await branchService.deactivateBranch(req.params.id);
    req.audit = { entityId: parseInt(req.params.id, 10) || null };
    res.json(result);
  } catch (error) {
    console.error("Lỗi deactivateBranch:", error);
    res.status(400).json({ message: error.message || "Không thể vô hiệu hóa chi nhánh" });
  }
};

/** [MANAGER] Manager xem chi nhánh mình phụ trách. Ctrl+F: getMyBranch */
exports.getMyBranch = async (req, res) => {
  try {
    const branch = await branchService.getBranchByManager(req.userId);
    res.json(toJSON(branch));
  } catch (error) {
    console.error("Lỗi getMyBranch:", error);
    res.status(400).json({ message: error.message || "Không thể tải chi nhánh quản lý" });
  }
};

/** [MANAGER] Manager cập nhật thông tin chi nhánh mình phụ trách. Ctrl+F: updateMyBranch */
exports.updateMyBranch = async (req, res) => {
  try {
    const branch = await branchService.updateMyBranch(req.userId, req.body);
    const json = toJSON(branch);
    req.audit = { entityId: json.branch_id, description: `Manager cập nhật chi nhánh #${json.branch_id}` };
    res.json(json);
  } catch (error) {
    console.error("Lỗi updateMyBranch:", error);
    res.status(400).json({ message: error.message || "Không thể cập nhật chi nhánh" });
  }
};
