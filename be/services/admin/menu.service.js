const { MenuItem } = require("../../models");

const adminMenuService = {
  async getAll(branchId = 1) {
    return await MenuItem.findAll({ where: { branch_id: branchId } });
  },

  async getById(id, branchId = 1) {
    return await MenuItem.findOne({ where: { item_id: id, branch_id: branchId } });
  },

  async create(data) {
    return await MenuItem.create(data);
  },

  async update(id, data, branchId = 1) {
    const item = await MenuItem.findOne({ where: { item_id: id, branch_id: branchId } });
    if (!item) throw new Error("Menu item not found");
    return await item.update(data);
  },

  async remove(id, branchId = 1) {
    const item = await MenuItem.findOne({ where: { item_id: id, branch_id: branchId } });
    if (!item) throw new Error("Menu item not found");
    await item.destroy();
    return true;
  },
};

module.exports = adminMenuService;