const db = require('./db');

// Định nghĩa quan hệ ở đây
db.User.hasMany(db.Order, { foreignKey: 'user_id' });
db.Order.belongsTo(db.User, { foreignKey: 'user_id' });

db.Branch.hasMany(db.User, { foreignKey: 'branch_id' });
db.User.belongsTo(db.Branch, { foreignKey: 'branch_id' });

db.Branch.hasMany(db.Table, { foreignKey: 'branch_id' });
db.Table.belongsTo(db.Branch, { foreignKey: 'branch_id' });

db.Branch.hasMany(db.MenuItem, { foreignKey: 'branch_id' });
db.MenuItem.belongsTo(db.Branch, { foreignKey: 'branch_id' });

db.Branch.hasMany(db.Reservation, { foreignKey: 'branch_id' });
db.Reservation.belongsTo(db.Branch, { foreignKey: 'branch_id' });

db.Branch.hasMany(db.Employee, { foreignKey: 'branch_id' });
db.Employee.belongsTo(db.Branch, { foreignKey: 'branch_id' });

db.Order.hasMany(db.OrderItem, { foreignKey: 'order_id' });
db.OrderItem.belongsTo(db.Order, { foreignKey: 'order_id' });

db.MenuItem.hasMany(db.OrderItem, { foreignKey: 'item_id' });
db.OrderItem.belongsTo(db.MenuItem, { foreignKey: 'item_id' });

db.Order.hasOne(db.Payment, { foreignKey: 'order_id' });
db.Payment.belongsTo(db.Order, { foreignKey: 'order_id' });

db.Reservation.hasOne(db.Payment, { foreignKey: 'reservation_id' });
db.Payment.belongsTo(db.Reservation, { foreignKey: 'reservation_id' });

db.Table.hasMany(db.Reservation, { foreignKey: 'table_id' });
db.Reservation.belongsTo(db.Table, { foreignKey: 'table_id' });

db.Table.hasMany(db.Order, { foreignKey: 'table_id', as: 'TableOrders' });
db.Order.belongsTo(db.Table, { foreignKey: 'table_id' });

db.User.hasMany(db.Reservation, { foreignKey: 'user_id' });
db.Reservation.belongsTo(db.User, { foreignKey: 'user_id' });

// Employee relationships
db.User.hasOne(db.Employee, { foreignKey: 'user_id' });
db.Employee.belongsTo(db.User, { foreignKey: 'user_id' });

// Reservation - Order (đúng alias)
db.Reservation.hasMany(db.Order, { foreignKey: 'reservation_id', as: 'Orders' });
db.Order.belongsTo(db.Reservation, { foreignKey: 'reservation_id' });

module.exports = db;