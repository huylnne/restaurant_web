const waiterService = require('../../services/admin/waiter.service');
const billService = require('../../services/bill.service');

const waiterController = {
  // POST /api/admin/waiter/orders
  async createOrder(req, res) {
    try {
      const { table_id, items } = req.body;
      if (!table_id || !Array.isArray(items)) return res.status(400).json({ message: 'table_id and items are required' });

      const createdBy = req.user?.user_id || null;
      const result = await waiterService.createOrder({ table_id, items, createdBy });
      return res.status(201).json(result);
    } catch (err) {
      console.error('waiter.createOrder', err);
      const message = err.message || (err.original && err.original.message) || 'Server error';
      return res.status(500).json({ message });
    }
  },

  // GET /api/admin/waiter/orders?table_id=...
  async listOrdersByTable(req, res) {
    try {
      const table_id = req.query.table_id;
      if (!table_id) return res.status(400).json({ message: 'table_id is required' });
      const orders = await waiterService.getOrdersByTable(table_id);
      return res.json(orders);
    } catch (err) {
      console.error('waiter.listOrdersByTable', err);
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  },

  // PATCH /api/admin/waiter/order-items/:id/served
  async serveOrderItem(req, res) {
    try {
      const id = req.params.id;
      const updated = await waiterService.markItemServed(id);
      return res.json(updated);
    } catch (err) {
      console.error('waiter.serveOrderItem', err);
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  },

  // PATCH /api/admin/waiter/tables/:id/status
  async updateTableStatus(req, res) {
    try {
      const table_id = req.params.id;
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: 'status is required' });
      const table = await waiterService.updateTableStatus(table_id, status);
      return res.json(table);
    } catch (err) {
      console.error('waiter.updateTableStatus', err);
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  },

  // GET /api/admin/waiter/tables/:id/bill
  async getTableBill(req, res) {
    try {
      const tableId = req.params.id;
      if (!tableId) return res.status(400).json({ message: 'table_id is required' });
      const bill = await billService.getBillByTable(tableId);
      if (!bill) return res.status(404).json({ message: 'Không tìm thấy bill cho bàn này' });
      return res.json(bill);
    } catch (err) {
      console.error('waiter.getTableBill', err);
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  },
};

module.exports = waiterController;