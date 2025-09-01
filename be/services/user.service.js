// services/userService.js
const db = require("../models/db"); // hoặc chỉnh đường dẫn cho đúng
const User = db.User;

exports.registerUser = async (userData) => {
  const { username, password, role, full_name, phone, avatar_url } = userData;
  const existing = await User.findOne({ where: { username } });
  if (existing) throw new Error("Username đã tồn tại");

  const newUser = await User.create({
    username,
    password_hash: password, // NOTE: chưa hash đâu nhé!
    role,
    full_name,
    phone,
    avatar_url,
  });
  return newUser;
};

exports.getProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ['full_name', 'avatar_url','phone']
  });
  if (!user) throw new Error('User không tồn tại');
  return {
    name: user.full_name,
    avatar: user.avatar_url,
    phone: user.phone
  };
};

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

exports.changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("Người dùng không tồn tại");

  if (user.password_hash !== currentPassword) { // CHỐT: NÊN HASH PASSWORD!
    throw new Error("Mật khẩu hiện tại không đúng");
  }
  user.password_hash = newPassword;
  await user.save();
  return true;
};

const { Reservation, Order, OrderItem, MenuItem, Table } = require('../models');

exports.getReservationsWithOrders = async (userId) => {
  return await Reservation.findAll({
    where: { user_id: userId },
    include: [
      {
        model: Order,
        include: [
          {
            model: OrderItem,
            include: [
              {
                model: MenuItem,
                attributes: ['name', 'price']
              }
            ]
          }
        ]
      },
      {
        model: Table,
        attributes: ['table_number', 'capacity']
      }
    ],
    order: [['created_at', 'DESC']]
  });
};
