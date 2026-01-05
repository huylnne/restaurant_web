
const { MenuItem } = require("../models");

const menuService = {

  async getAll() {
    return await MenuItem.findAll();
  },


  async getById(id) {
    return await MenuItem.findByPk(id);
  },
};

module.exports = menuService;
