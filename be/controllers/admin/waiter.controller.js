const waiterService = require('../../services/admin/waiter.service');
const billService = require('../../services/bill.service');
const paymentService = require('../../services/payment.service');
const invoiceService = require('../../services/invoice.service');
const realtimeHub = require('../../realtimeHub');
const db = require('../../models');
const { OrderItem, MenuItem, Order, Table } = db;

const waiterController = {
  // POST /api/admin/waiter/orders
  async createOrder(req, res) {
    try {
      const { table_id, items } = req.body;
      if (!table_id || !Array.isArray(items)) return res.status(400).json({ message: 'table_id and items are required' });

      const createdBy = req.user?.user_id || null;
      const result = await waiterService.createOrder({ table_id, items, createdBy });
      req.audit = {
        entityId: result?.order_id ?? result?.order?.order_id,
        description: `Phục vụ tạo đơn bàn #${table_id}`,
        metadata: { table_id, itemCount: items.length },
      };
      try {
        const t = await Table.findByPk(table_id, { attributes: ['branch_id', 'table_number'] });
        if (t?.branch_id) {
          realtimeHub.notifyBranch(t.branch_id, {
            type: 'order_flow',
            reason: 'waiter_new_order',
            table_id: Number(table_id),
            table_number: t.table_number ?? null,
          });
        }
      } catch (_) {}
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
      const before = await OrderItem.findByPk(id, {
        include: [
          { model: MenuItem, attributes: ['branch_id', 'name'] },
          {
            model: Order,
            attributes: ['order_id', 'table_id', 'reservation_id'],
            include: [{ model: Table, attributes: ['table_id', 'table_number'] }],
          },
        ],
      });
      const updated = await waiterService.markItemServed(id);
      try {
        const plain = before?.toJSON?.() || {};
        const branchId = plain.MenuItem?.branch_id;
        if (branchId) {
          const tbl = plain.Order?.Table;
          realtimeHub.notifyBranch(branchId, {
            type: 'order_item_status',
            order_item_id: Number(id),
            status: 'served',
            table_id: tbl?.table_id ?? plain.Order?.table_id ?? null,
            table_number: tbl?.table_number ?? null,
            menu_name: plain.MenuItem?.name ?? null,
          });
        }
      } catch (_) {}
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

  // GET /api/admin/waiter/tables/:id/payment
  async getTablePayment(req, res) {
    try {
      const tableId = Number(req.params.id);
      if (!tableId) return res.status(400).json({ message: 'table_id is required' });

      const activeReservation = await paymentService.getActiveReservationByTableId(tableId);
      if (!activeReservation) return res.status(404).json({ message: 'Không có phiên bàn đang hoạt động' });

      const payment = await paymentService.getPaymentByReservation(activeReservation.reservation_id);
      return res.json({
        reservation_id: activeReservation.reservation_id,
        payment: payment || null,
      });
    } catch (err) {
      console.error('waiter.getTablePayment', err);
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  },

  // POST /api/admin/waiter/tables/:id/checkout
  async finalizePayment(req, res) {
    try {
      const tableId = Number(req.params.id);
      const { method, transaction_ref } = req.body || {};
      if (!tableId) return res.status(400).json({ message: 'table_id is required' });
      if (!method) return res.status(400).json({ message: 'method is required' });

      const payment = await paymentService.finalizeReservationPayment({
        tableId,
        method,
        transactionRef: transaction_ref,
      });

      req.audit = {
        entityId: payment.payment_id,
        description: `Xác nhận thanh toán bàn #${tableId}`,
        metadata: { method },
      };

      return res.json({ payment });
    } catch (err) {
      console.error('waiter.finalizePayment', err);
      const map = {
        RESERVATION_NOT_FOUND: 404,
        NO_ACTIVE_SESSION: 404,
        INVALID_AMOUNT: 400,
        UNSUPPORTED_METHOD: 400,
      };
      return res.status(map[err.message] || 500).json({ message: err.message || 'Server error' });
    }
  },

  // GET /api/admin/waiter/reservations/:id/invoice.pdf
  async getInvoicePdf(req, res) {
    try {
      const reservationId = Number(req.params.id);
      if (!reservationId) return res.status(400).json({ message: 'reservation_id is required' });

      const payment = await paymentService.getPaymentByReservation(reservationId);
      if (!payment || payment.status !== 'succeeded') {
        return res.status(404).json({ message: 'Chưa có hóa đơn thanh toán' });
      }

      const reservation = await db.Reservation.findByPk(reservationId, {
        include: [
          { model: db.Table },
          { model: db.User },
          { model: db.Branch },
        ],
      });
      if (!reservation) return res.status(404).json({ message: 'Không tìm thấy đặt bàn' });

      const bill = await billService.getBillByTable(reservation.table_id);
      const branch = reservation.Branch || null;
      const table = reservation.Table || null;
      const user = reservation.User || null;

      const methodLabels = {
        CASH: 'Tiền mặt',
        BANK_TRANSFER: 'Chuyển khoản',
        CARD: 'Thẻ',
        WALLET: 'Ví điện tử',
        MOMO: 'MoMo',
        COD: 'Tiền mặt',
      };

      const pdfBuffer = await invoiceService.buildInvoicePdf({
        payment,
        reservation,
        bill,
        branch,
        table,
        user,
        methodLabel: methodLabels[payment.method] || payment.method,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="invoice-${payment.invoice_no || payment.payment_id}.pdf"`
      );
      return res.send(pdfBuffer);
    } catch (err) {
      console.error('waiter.getInvoicePdf', err);
      return res.status(500).json({ message: err.message || 'Server error' });
    }
  },
};

module.exports = waiterController;