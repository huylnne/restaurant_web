const db = require("../models/db");
const User = db.User;
const { Reservation, Order, OrderItem, MenuItem, Table } = require('../models');

// ✅ Lấy profile
exports.getProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ['full_name', 'avatar_url', 'phone']
  });
  if (!user) throw new Error('User không tồn tại');
  return {
    name: user.full_name,
    avatar: user.avatar_url,
    phone: user.phone
  };
};

//  Cập nhật profile
exports.updateProfile = async (userId, data) => {
  const { full_name, phone, avatar_url } = data;
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User không tồn tại');

  user.full_name = full_name ?? user.full_name;
  user.phone = phone ?? user.phone;
  user.avatar_url = avatar_url !== undefined ? avatar_url : user.avatar_url;

  await user.save();
  return user;
};

//  Đổi mật khẩu
exports.changePassword = async (userId, currentPassword, newPassword) => {
  const bcrypt = require('bcrypt');
  const user = await User.findByPk(userId);
  if (!user) throw new Error("Người dùng không tồn tại");

  // Kiểm tra password hiện tại
  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    throw new Error("Mật khẩu hiện tại không đúng");
  }

  // Hash password mới
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password_hash = hashedPassword;
  await user.save();
  return true;
};

//  Lấy lịch sử đặt bàn với orders
exports.getReservationsWithOrders = async (userId) => {
  try {
    const reservations = await Reservation.findAll({
      where: { user_id: userId },
      attributes: [
        'reservation_id',
        'reservation_time',
        'number_of_guests',
        'status',
        'table_id',
        'branch_id',
        'created_at'
      ],
      include: [
        {
          model: Order,
          as: 'Orders',
          required: false,
          include: [
            {
              model: OrderItem,
              as: 'OrderItems',
              required: false,
              include: [
                {
                  model: MenuItem,
                  as: 'MenuItem',
                  attributes: ['name', 'price']
                }
              ]
            }
          ]
        },
        {
          model: Table,
          as: 'Table',
          attributes: ['table_number', 'capacity']
        }
      ],
      order: [['reservation_time', 'DESC']]
    });

    return reservations;
  } catch (error) {
    console.error('Lỗi getReservationsWithOrders:', error);
    throw new Error('Không thể lấy lịch sử đặt bàn');
  }
};