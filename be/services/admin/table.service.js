const { Table, Reservation, Order, User } = require('../../models');

const tableService = {
  // Lấy danh sách bàn
  async getTables() {
    const tables = await Table.findAll({
      include: [
        {
          model: Reservation,
          required: false,
          include: [
            {
              model: Order,
              required: false
            },
            {
              model: User,
              required: false,
              attributes: ['user_id', 'full_name', 'phone']
            }
          ]
        }
      ],
      order: [['table_number', 'ASC']]
    });

    // Tính toán thông tin bổ sung cho mỗi bàn
    return tables.map(table => {
      const tableData = table.toJSON();
      
      // Tìm reservation đang active (confirmed và chưa qua)
      const activeReservation = tableData.Reservations?.find(
        r => r.status === 'confirmed' && new Date(r.reservation_time) > new Date()
      );

      // Tính doanh thu bàn (nếu có order completed)
      const totalRevenue = tableData.Reservations?.reduce((sum, reservation) => {
        if (reservation.Order && reservation.Order.status === 'COMPLETED') {
          return sum + parseFloat(reservation.Order.total_amount || 0);
        }
        return sum;
      }, 0) || 0;

      return {
        ...tableData,
        activeReservation,
        totalRevenue
      };
    });
  },

  // Thêm bàn mới
  async createTable(data) {
    const { table_number, capacity } = data;
    
    // Kiểm tra số bàn đã tồn tại chưa
    const existingTable = await Table.findOne({ where: { table_number } });
    if (existingTable) {
      throw new Error('Số bàn đã tồn tại');
    }

    const table = await Table.create({
      table_number,
      capacity,
      status: 'available'
    });

    return table;
  },

  // Sửa bàn
  async updateTable(tableNumber, data) {
    const table = await Table.findOne({ where: { table_number: tableNumber } });
    if (!table) {
      throw new Error('Không tìm thấy bàn');
    }

    const { table_number, capacity, status } = data;

    // Nếu đổi số bàn, kiểm tra số mới đã tồn tại chưa
    if (table_number && table_number !== table.table_number) {
      const existingTable = await Table.findOne({ where: { table_number } });
      if (existingTable) {
        throw new Error('Số bàn mới đã tồn tại');
      }
    }

    await table.update({ 
      table_number: table_number || table.table_number, 
      capacity: capacity || table.capacity, 
      status: status || table.status 
    });
    
    return table;
  },

  // ✅ Xóa bàn theo table_number
  async deleteTable(tableNumber) {
    const table = await Table.findOne({ where: { table_number: tableNumber } });
    if (!table) {
      throw new Error('Không tìm thấy bàn');
    }

    // Kiểm tra bàn có đang được sử dụng không
    if (table.status !== 'available') {
      throw new Error('Không thể xóa bàn đang được sử dụng');
    }

    await table.destroy();
    return { message: 'Đã xóa bàn thành công' };
  },

  // Lấy hoạt động gần đây
  async getTableActivities() {
    const activities = await Reservation.findAll({
      limit: 10,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Table,
          required: true
        },
        {
          model: User,
          required: false,
          attributes: ['user_id', 'full_name', 'phone']
        },
        {
          model: Order,
          required: false
        }
      ]
    });

    return activities.map(activity => {
      const activityData = activity.toJSON();
      return {
        ...activityData,
        activityType: activityData.Order ? 'order' : 'reservation',
        timestamp: activityData.created_at
      };
    });
  },

  // Lấy thống kê tổng quan bàn
  // ...existing code...

// Lấy thống kê tổng quan bàn
async getTableSummary() {
  const totalTables = await Table.count();
  const emptyTables = await Table.count({ where: { status: 'available' } });
  const occupiedTables = await Table.count({ where: { status: 'occupied' } });
  const reservedTables = await Table.count({ where: { status: 'pre-ordered' } });

  // ✅ Tính tổng doanh thu từ order_items (vì orders không có total_amount)
  const { Sequelize } = require('sequelize');
  const db = require('../../models/db');
  
  const revenueQuery = `
    SELECT COALESCE(SUM(oi.quantity * mi.price), 0) as total
    FROM order_items oi
    JOIN menu_items mi ON oi.item_id = mi.item_id
    JOIN orders o ON oi.order_id = o.order_id
    WHERE o.status IN ('IN_PROGRESS', 'COMPLETED')
  `;
  
  const [revenueResult] = await db.sequelize.query(revenueQuery, {
    type: Sequelize.QueryTypes.SELECT
  });

  return {
    totalTables,
    emptyTables,
    occupiedTables,
    reservedTables,
    currentRevenue: parseFloat(revenueResult.total) || 0
  };
}

};

module.exports = tableService;