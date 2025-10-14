
const { MenuItem } = require("../models");

const menuService = {

  async getAll() {
    return await MenuItem.findAll();
  },


  async getById(id) {
    return await MenuItem.findByPk(id);
  },


  async create(data) {
    return await MenuItem.create(data);
  },

  
  async update(id, data) {
    const item = await MenuItem.findByPk(id);
    if (!item) throw new Error("Menu item not found");
    return await item.update(data);
  },

 
  async remove(id) {
    const item = await MenuItem.findByPk(id);
    if (!item) throw new Error("Menu item not found");
    await item.destroy();
    return true;
  },
};

module.exports = menuService;
