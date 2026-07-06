/**
 * CONTROLLER ADMIN MENU — HTTP layer cho quản lý món ăn theo chi nhánh.
 * Ctrl+F: admin menu controller, getAll, create menu, update menu
 * Luồng demo: Phần 5 — Bước 5.4 quản lý món ăn.
 */
const menuService = require("../../services/admin/menu.service");
const { resolveBranchId } = require('../../utils/branchScope');

/** [QUẢN LÝ MÓN] Danh sách món theo branchId/branch_id. Ctrl+F: getAll menu */
exports.getAll = async (req, res) => {
  try {
    console.log("📋 GET /api/admin/menu - getAll");
    const branchId = resolveBranchId(req, req.query.branchId || req.query.branch_id, 1);
    const items = await menuService.getAll(branchId);
    res.json(items);
  } catch (err) {
    console.error("❌ Error in getAll:", err);
    res.status(500).json({ message: err.message });
  }
};

/** [QUẢN LÝ MÓN] Chi tiết một món trong đúng chi nhánh. Ctrl+F: getById menu */
exports.getById = async (req, res) => {
  try {
    console.log("📋 GET /api/admin/menu/:id - getById");
    const branchId = resolveBranchId(req, req.query.branchId || req.query.branch_id, 1);
    const item = await menuService.getById(req.params.id, branchId);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (err) {
    console.error("❌ Error in getById:", err);
    res.status(500).json({ message: err.message });
  }
};

/** [QUẢN LÝ MÓN] Thêm món mới và ghi audit. Ctrl+F: create menu */
exports.create = async (req, res) => {
  try {
    console.log("📝 POST /api/admin/menu - create");
    console.log("Request body:", req.body);
    const branchId = resolveBranchId(req, req.body.branch_id || req.query.branchId, 1);
    const payload = { ...req.body, branch_id: branchId };
    const newItem = await menuService.create(payload);
    req.audit = {
      entityId: newItem.item_id,
      description: `Thêm món #${newItem.item_id}: ${newItem.name || ''}`.trim(),
    };
    res.status(201).json(newItem);
  } catch (err) {
    console.error("❌ Error in create:", err);
    res.status(400).json({ message: err.message });
  }
};

/** [QUẢN LÝ MÓN] Cập nhật tên/giá/sale/category/trạng thái món. Ctrl+F: update menu */
exports.update = async (req, res) => {
  try {
    console.log("✏️ PUT /api/admin/menu/:id - update");
    console.log("Request body:", req.body);
    const branchId = resolveBranchId(req, req.body.branch_id || req.query.branchId, 1);
    const payload = { ...req.body, branch_id: branchId };
    const updated = await menuService.update(req.params.id, payload, branchId);
    res.json(updated);
  } catch (err) {
    console.error("❌ Error in update:", err);
    res.status(400).json({ message: err.message });
  }
};

/** [QUẢN LÝ MÓN] Xóa món trong đúng chi nhánh. Ctrl+F: remove menu */
exports.remove = async (req, res) => {
  try {
    console.log("🗑️ DELETE /api/admin/menu/:id - remove");
    const branchId = resolveBranchId(req, req.query.branchId || req.query.branch_id, 1);
    await menuService.remove(req.params.id, branchId);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("❌ Error in remove:", err);
    res.status(400).json({ message: err.message });
  }
};