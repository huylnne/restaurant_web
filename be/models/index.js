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



db.Branch.hasMany(db.Employee, { foreignKey: 'branch_id' });

db.Employee.belongsTo(db.Branch, { foreignKey: 'branch_id' });



db.Branch.hasMany(db.Order, { foreignKey: 'branch_id' });

db.Order.belongsTo(db.Branch, { foreignKey: 'branch_id' });



db.Order.hasMany(db.OrderItem, { foreignKey: 'order_id' });

db.OrderItem.belongsTo(db.Order, { foreignKey: 'order_id' });



db.MenuItem.hasMany(db.OrderItem, { foreignKey: 'item_id' });

db.OrderItem.belongsTo(db.MenuItem, { foreignKey: 'item_id' });



db.Order.hasOne(db.Payment, { foreignKey: 'order_id' });

db.Payment.belongsTo(db.Order, { foreignKey: 'order_id' });



db.Table.hasMany(db.Order, { foreignKey: 'table_id', as: 'TableOrders' });

db.Order.belongsTo(db.Table, { foreignKey: 'table_id' });



db.User.hasMany(db.Review, { foreignKey: 'user_id' });

db.Review.belongsTo(db.User, { foreignKey: 'user_id' });



db.Order.hasOne(db.Review, { foreignKey: 'order_id' });

db.Review.belongsTo(db.Order, { foreignKey: 'order_id' });



// Employee relationships

db.User.hasOne(db.Employee, { foreignKey: 'user_id' });

db.Employee.belongsTo(db.User, { foreignKey: 'user_id' });



db.User.hasMany(db.OperationLog, { foreignKey: 'user_id' });

db.OperationLog.belongsTo(db.User, { foreignKey: 'user_id' });



module.exports = db;

