/**
 * MODEL ASSOCIATIONS — khai báo quan hệ Sequelize giữa các bảng nghiệp vụ.
 * Ctrl+F: model associations, User.hasMany Order, OrderTable, Payment, Review
 * Đây là file quan trọng khi include bị lỗi hoặc cần biết model nào liên kết với model nào.
 */
const db = require('./db');



// [USER ↔ ORDER] Một khách/user có nhiều order đặt bàn/phiên phục vụ.

db.User.hasMany(db.Order, { foreignKey: 'user_id' });

db.Order.belongsTo(db.User, { foreignKey: 'user_id' });



// [BRANCH ↔ USER] Nhân viên/manager gắn với chi nhánh.
db.Branch.hasMany(db.User, { foreignKey: 'branch_id' });

db.User.belongsTo(db.Branch, { foreignKey: 'branch_id' });



// [BRANCH ↔ TABLE] Chi nhánh có nhiều bàn.
db.Branch.hasMany(db.Table, { foreignKey: 'branch_id' });

db.Table.belongsTo(db.Branch, { foreignKey: 'branch_id' });



// [BRANCH ↔ MENU] Mỗi chi nhánh có menu riêng.
db.Branch.hasMany(db.MenuItem, { foreignKey: 'branch_id' });

db.MenuItem.belongsTo(db.Branch, { foreignKey: 'branch_id' });



// [BRANCH ↔ EMPLOYEE] Chi nhánh có nhiều nhân viên.
db.Branch.hasMany(db.Employee, { foreignKey: 'branch_id' });

db.Employee.belongsTo(db.Branch, { foreignKey: 'branch_id' });



// [BRANCH ↔ ORDER] Order thuộc chi nhánh để báo cáo/phân quyền.
db.Branch.hasMany(db.Order, { foreignKey: 'branch_id' });

db.Order.belongsTo(db.Branch, { foreignKey: 'branch_id' });



// [ORDER ↔ ORDER ITEM] Một phiên có nhiều món.
db.Order.hasMany(db.OrderItem, { foreignKey: 'order_id' });

db.OrderItem.belongsTo(db.Order, { foreignKey: 'order_id' });



// [MENU ITEM ↔ ORDER ITEM] Một món menu xuất hiện trong nhiều dòng gọi món.
db.MenuItem.hasMany(db.OrderItem, { foreignKey: 'item_id' });

db.OrderItem.belongsTo(db.MenuItem, { foreignKey: 'item_id' });



// [ORDER ↔ PAYMENT] Một order có một payment hiện tại.
db.Order.hasOne(db.Payment, { foreignKey: 'order_id' });

db.Payment.belongsTo(db.Order, { foreignKey: 'order_id' });



// [TABLE ↔ ORDER] Bàn chính của order, alias TableOrders dùng cho sơ đồ bàn.
db.Table.hasMany(db.Order, { foreignKey: 'table_id', as: 'TableOrders' });

db.Order.belongsTo(db.Table, { foreignKey: 'table_id' });

// [ORDER ↔ ORDER_TABLE ↔ TABLE] Bảng nối cho ghép nhiều bàn.
db.Order.hasMany(db.OrderTable, { foreignKey: 'order_id' });
db.OrderTable.belongsTo(db.Order, { foreignKey: 'order_id' });
db.OrderTable.belongsTo(db.Table, { foreignKey: 'table_id' });
db.Table.hasMany(db.OrderTable, { foreignKey: 'table_id' });



// [USER ↔ REVIEW] Khách đăng nhập có thể có nhiều đánh giá.
db.User.hasMany(db.Review, { foreignKey: 'user_id' });

db.Review.belongsTo(db.User, { foreignKey: 'user_id' });



// [ORDER ↔ REVIEW] Mỗi order tối đa một review.
db.Order.hasOne(db.Review, { foreignKey: 'order_id' });

db.Review.belongsTo(db.Order, { foreignKey: 'order_id' });



// [USER ↔ EMPLOYEE] Tài khoản staff có một hồ sơ nhân viên.

db.User.hasOne(db.Employee, { foreignKey: 'user_id' });

db.Employee.belongsTo(db.User, { foreignKey: 'user_id' });

// [EMPLOYEE ↔ WORK SHIFT] Nhân viên có nhiều ca làm việc.
db.Employee.hasMany(db.WorkShift, { foreignKey: 'employee_id' });
db.WorkShift.belongsTo(db.Employee, { foreignKey: 'employee_id' });
db.Branch.hasMany(db.WorkShift, { foreignKey: 'branch_id' });
db.WorkShift.belongsTo(db.Branch, { foreignKey: 'branch_id' });

// [ORDER ↔ WAITER] Phiên phục vụ gắn với nhân viên phụ trách.
db.User.hasMany(db.Order, { foreignKey: 'assigned_waiter_id', as: 'AssignedOrders' });



// [USER ↔ OPERATION LOG] Một user tạo nhiều nhật ký thao tác.
db.User.hasMany(db.OperationLog, { foreignKey: 'user_id' });

db.OperationLog.belongsTo(db.User, { foreignKey: 'user_id' });



module.exports = db;

