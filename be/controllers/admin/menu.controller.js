const menuService = require("../../services/admin/menu.service");

exports.getAll = async (req, res) => {
  try {
    console.log("📋 GET /api/admin/menu - getAll");
    const items = await menuService.getAll();
    res.json(items);
  } catch (err) {
    console.error("❌ Error in getAll:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    console.log("📋 GET /api/admin/menu/:id - getById");
    const item = await menuService.getById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (err) {
    console.error("❌ Error in getById:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    console.log("📝 POST /api/admin/menu - create");
    console.log("Request body:", req.body);
    const newItem = await menuService.create(req.body);
    res.status(201).json(newItem);
  } catch (err) {
    console.error("❌ Error in create:", err);
    res.status(400).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    console.log("✏️ PUT /api/admin/menu/:id - update");
    console.log("Request body:", req.body);
    const updated = await menuService.update(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error("❌ Error in update:", err);
    res.status(400).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    console.log("🗑️ DELETE /api/admin/menu/:id - remove");
    await menuService.remove(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("❌ Error in remove:", err);
    res.status(400).json({ message: err.message });
  }
};