const waiterService = require('../../services/admin/waiter.service');

const billService = require('../../services/bill.service');

const paymentService = require('../../services/payment.service');

const invoiceService = require('../../services/invoice.service');

const realtimeHub = require('../../realtimeHub');

const db = require('../../models');

const { Op } = require('sequelize');

const { OrderItem, MenuItem, Order, Table } = db;

const { ACTIVE_SESSION_STATUSES } = require('../../utils/reservationStatus');
const { findActiveOrderByTableId, buildRealtimeTablePayload, getTablesForOrder } = require('../../utils/orderTableLinks');



async function getActiveSessionOrder(tableId) {
  return findActiveOrderByTableId(tableId);
}



const waiterController = {

  async createOrder(req, res) {

    try {

      const { table_id, items, note } = req.body;

      if (!table_id || !Array.isArray(items)) return res.status(400).json({ message: 'table_id and items are required' });



      const createdBy = req.user?.user_id || null;

      const result = await waiterService.createOrder({ table_id, items, note, createdBy });

      req.audit = {

        entityId: result?.order_id ?? result?.order?.order_id,

        description: `Phục vụ tạo đơn bàn #${table_id}`,

        metadata: { table_id, itemCount: items.length },

      };

      try {

        const orderId = result?.order?.order_id ?? result?.order_id;
        const tables = orderId ? await getTablesForOrder(orderId) : [];
        const primaryTable = tables[0] || (await Table.findByPk(table_id, { attributes: ['branch_id', 'table_number', 'table_id'] }));
        const branchId = primaryTable?.branch_id;

        if (branchId) {
          const orderPlain = {
            table_id,
            Table: primaryTable,
            OrderTables: tables.map((t) => ({ Table: t })),
          };

          realtimeHub.notifyBranch(branchId, {
            type: 'order_flow',
            reason: 'waiter_new_order',
            ...buildRealtimeTablePayload(orderPlain),
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



  async serveOrderItem(req, res) {

    try {

      const id = req.params.id;

      const before = await OrderItem.findByPk(id, {

        include: [

          { model: MenuItem, attributes: ['branch_id', 'name'] },

          {

            model: Order,

            attributes: ['order_id', 'table_id', 'branch_id'],

            include: [
              { model: Table, attributes: ['table_id', 'table_number'] },
              {
                model: db.OrderTable,
                attributes: ['table_id', 'is_primary'],
                required: false,
                include: [{ model: Table, attributes: ['table_id', 'table_number'] }],
              },
            ],

          },

        ],

      });

      const updated = await waiterService.markItemServed(id);

      try {

        const plain = before?.toJSON?.() || {};

        const branchId = plain.MenuItem?.branch_id ?? plain.Order?.branch_id;

        if (branchId) {

          realtimeHub.notifyBranch(branchId, {

            type: 'order_item_status',

            order_item_id: Number(id),

            status: 'served',

            ...buildRealtimeTablePayload(plain.Order),

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



  async getTablePayment(req, res) {

    try {

      const tableId = Number(req.params.id);

      if (!tableId) return res.status(400).json({ message: 'table_id is required' });



      const activeOrder = await getActiveSessionOrder(tableId);

      if (!activeOrder) return res.status(404).json({ message: 'Không có phiên bàn đang hoạt động' });



      const payment = await paymentService.getPaymentByOrder(activeOrder.order_id);

      return res.json({

        order_id: activeOrder.order_id,

        reservation_id: activeOrder.order_id,

        payment: payment || null,

      });

    } catch (err) {

      console.error('waiter.getTablePayment', err);

      return res.status(500).json({ message: err.message || 'Server error' });

    }

  },



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

        ORDER_NOT_FOUND: 404,

        NO_ACTIVE_SESSION: 404,

        INVALID_AMOUNT: 400,

        UNSUPPORTED_METHOD: 400,

      };

      return res.status(map[err.message] || 500).json({ message: err.message || 'Server error' });

    }

  },



  async getInvoicePdf(req, res) {

    try {

      const orderId = Number(req.params.id);

      if (!orderId) return res.status(400).json({ message: 'order_id is required' });



      const payment = await paymentService.getPaymentByOrder(orderId);

      if (!payment || payment.status !== 'succeeded') {

        return res.status(404).json({ message: 'Chưa có hóa đơn thanh toán' });

      }



      const order = await db.Order.findByPk(orderId, {

        include: [

          { model: db.Table },

          { model: db.User },

          { model: db.Branch },

        ],

      });

      if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn / phiên bàn' });



      const bill = await billService.getBillByTable(order.table_id);

      const branch = order.Branch || null;

      const table = order.Table || null;

      const user = order.User || null;



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

        order,

        reservation: order,

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

