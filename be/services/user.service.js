const db = require("../models/db");
const User = db.User;
const { Reservation, Order, OrderItem, MenuItem, Table } = require('../models');
const DEFAULT_AVATAR_URL = "https://tse3.mm.bing.net/th/id/OIP.aCwqDO1MIaS3qzA7DyFPdAHaHa?pid=Api&P=0&h=180";

// ✅ Lấy profile
exports.getProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ['full_name', 'avatar_url', 'phone']
  });
  if (!user) throw new Error('User không tồn tại');
  return {
    name: user.full_name,
    avatar: user.avatar_url || DEFAULT_AVATAR_URL,
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
          attributes: ['table_number', 'capacity', 'status']
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

//  Lấy phiên bàn hiện tại của user (bàn gần nhất đang confirmed / pre-ordered)
exports.getCurrentTableSession = async (userId) => {
  try {
    const reservation = await Reservation.findOne({
      where: {
        user_id: userId,
        status: ['confirmed', 'pre-ordered', 'waiting_payment'],
      },
      attributes: [
        'reservation_id',
        'reservation_time',
        'number_of_guests',
        'status',
        'table_id',
        'branch_id',
        'created_at',
      ],
      include: [
        {
          model: Table,
          as: 'Table',
          attributes: ['table_number', 'capacity', 'status'],
        },
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
                  attributes: ['name', 'price'],
                },
              ],
            },
          ],
        },
      ],
      order: [['reservation_time', 'DESC']],
    });

    if (!reservation) return null;

    // Nếu bàn trống: chỉ return null khi reservation đã hoàn tất hoặc giờ đặt đã qua hẳn.
    // Trường hợp bàn còn 'available' nhưng reservation là tương lai (chưa tới giờ) → vẫn hiển thị.
    if (reservation.Table && reservation.Table.status === 'available') {
      const resTime = new Date(reservation.reservation_time);
      const isFuture = resTime > new Date();
      if (!isFuture) return null; // đã quá giờ mà bàn vẫn trống → phiên kết thúc
    }

    // Lấy thêm các order do nhân viên tạo trực tiếp theo bàn (không gắn reservation_id)
    if (reservation.table_id) {
      const waiterOrders = await Order.findAll({
        where: {
          table_id: reservation.table_id,
        },
        include: [
          {
            model: OrderItem,
            as: 'OrderItems',
            required: false,
            include: [
              {
                model: MenuItem,
                as: 'MenuItem',
                attributes: ['name', 'price'],
              },
            ],
          },
        ],
        order: [['created_at', 'DESC']],
      });

      const existingOrders = Array.isArray(reservation.Orders) ? reservation.Orders : [];
      const merged = [
        ...existingOrders,
        // loại bỏ những order đã có trong existingOrders (theo order_id) để tránh trùng
        ...waiterOrders.filter(
          (wo) => !existingOrders.some((eo) => eo.order_id === wo.order_id)
        ),
      ];

      reservation.Orders = merged;
    }

    return reservation;
  } catch (error) {
    console.error('Lỗi getCurrentTableSession:', error);
    throw new Error('Không thể lấy thông tin bàn hiện tại');
  }
};