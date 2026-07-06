/**
 * SERVICE ADMIN MENU — logic CRUD món ăn theo chi nhánh.
 * Ctrl+F: admin menu service, getAll menu, create menu item, remove menu item
 * Luồng demo: Phần 5 — Admin xem/quản lý món ăn.
 */
const { MenuItem } = require("../../models");

const adminMenuService = {
  /** [QUẢN LÝ MÓN] Lấy toàn bộ món của một chi nhánh. Ctrl+F: getAll menu service */
  async getAll(branchId = 1) {
    return await MenuItem.findAll({ where: { branch_id: branchId } });
  },

  /** [QUẢN LÝ MÓN] Lấy chi tiết món theo id + branch để không lộ món chi nhánh khác. Ctrl+F: getById menu service */
  async getById(id, branchId = 1) {
    return await MenuItem.findOne({ where: { item_id: id, branch_id: branchId } });
  },

  /** [QUẢN LÝ MÓN] Tạo món mới trong branch_id đã resolve từ controller. Ctrl+F: create menu service */
  async create(data) {
    return await MenuItem.create(data);
  },

  /** [QUẢN LÝ MÓN] Cập nhật món trong đúng chi nhánh. Ctrl+F: update menu service */
  async update(id, data, branchId = 1) {
    const item = await MenuItem.findOne({ where: { item_id: id, branch_id: branchId } });
    if (!item) throw new Error("Menu item not found");
    return await item.update(data);
  },

  /** [QUẢN LÝ MÓN] Xóa món trong đúng chi nhánh. Ctrl+F: remove menu service */
  async remove(id, branchId = 1) {
    const item = await MenuItem.findOne({ where: { item_id: id, branch_id: branchId } });
    if (!item) throw new Error("Menu item not found");
    await item.destroy();
    return true;
  },
};

module.exports = adminMenuService;