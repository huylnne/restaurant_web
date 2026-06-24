module.exports = (sequelize, DataTypes) => {

  const Order = sequelize.define(

    'Order',

    {

      order_id: {

        type: DataTypes.INTEGER,

        primaryKey: true,

        autoIncrement: true,

        allowNull: false,

      },

      user_id: {

        type: DataTypes.INTEGER,

        allowNull: true,

        references: { model: 'users', key: 'user_id' },

      },

      branch_id: {

        type: DataTypes.INTEGER,

        allowNull: true,

        references: { model: 'branches', key: 'branch_id' },

      },

      table_id: {

        type: DataTypes.INTEGER,

        allowNull: true,

        references: { model: 'tables', key: 'table_id' },

      },

      arrival_time: {

        type: DataTypes.DATE,

        allowNull: true,

      },

      expected_end_time: {

        type: DataTypes.DATE,

        allowNull: true,

        comment: 'Thời điểm dự kiến kết thúc giữ bàn (arrival_time + 2 giờ)',

      },

      number_of_guests: {

        type: DataTypes.INTEGER,

        allowNull: true,

      },

      status: {

        type: DataTypes.STRING(20),

        allowNull: false,

        defaultValue: 'pending',

        comment:

          'pending | confirmed | pre-ordered | in_progress | waiting_payment | completed | cancelled | no_show',

      },

      total_amount: {

        type: DataTypes.DECIMAL(10, 2),

        allowNull: true,

      },

      note: {

        type: DataTypes.STRING(200),

        allowNull: true,

      },

      order_type: {

        type: DataTypes.STRING(15),

        allowNull: false,

        defaultValue: 'dine_in',

        comment: 'reservation | walk_in | dine_in',

      },

      payment_status: {

        type: DataTypes.STRING(16),

        allowNull: false,

        defaultValue: 'unpaid',

        comment: 'unpaid | pending | succeeded | failed | canceled',

      },

      booking_group_id: {

        type: DataTypes.STRING(36),

        allowNull: true,

      },

      checked_in_at: {

        type: DataTypes.DATE,

        allowNull: true,

        comment: 'Thời điểm nhân viên xác nhận tiếp nhận khách vào bàn',

      },

      created_at: {

        type: DataTypes.DATE,

        allowNull: false,

        defaultValue: DataTypes.NOW,

      },

    },

    {

      tableName: 'orders',

      timestamps: false,

    }

  );



  Order.associate = (models) => {

    Order.belongsTo(models.Branch, { foreignKey: 'branch_id' });

    Order.belongsTo(models.Table, { foreignKey: 'table_id' });

    Order.belongsTo(models.User, { foreignKey: 'user_id' });

    Order.hasMany(models.OrderItem, { foreignKey: 'order_id' });

    Order.hasOne(models.Payment, { foreignKey: 'order_id' });

    Order.hasOne(models.Review, { foreignKey: 'order_id' });

  };



  return Order;

};

