const pool = require('../models/db');

const getAllMenuItems = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM menu_items WHERE is_active = true');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

module.exports = { getAllMenuItems };
