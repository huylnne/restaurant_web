/**
 * MIDDLEWARE XÁC THỰC / PHÂN QUYỀN — kiểm JWT, khóa tài khoản, role admin/waiter/kitchen/user.
 * Ctrl+F: auth middleware, verifyToken, verifyAdmin, authorizeRole, phân quyền
 * Luồng demo: tách tab user, waiter, kitchen, admin bằng JWT + role.
 */
const db = require('../models/db');
const User = db.User;
const { verifyAccessToken } = require('../utils/jwt');
const { getAccountBlockMessage } = require('../utils/userAccount');

/**
 * [AUTH] Load user hiện tại từ DB để kiểm tra tài khoản còn active/chưa bị khóa.
 * Ctrl+F: loadActiveUser, tài khoản bị khóa
 */
async function loadActiveUser(userId) {
  const user = await User.findByPk(userId, {
    attributes: ['user_id', 'username', 'role', 'branch_id', 'is_active', 'locked'],
  });
  const blockMsg = getAccountBlockMessage(user);
  if (blockMsg) {
    return { blocked: true, message: blockMsg };
  }
  return { user };
}

/**
 * [AUTH] Middleware bắt buộc đăng nhập: đọc Bearer token, verify JWT, gắn req.user/req.userRole.
 * Dùng cho API khách như đặt bàn, dashboard, bàn của tôi.
 * Ctrl+F: verifyToken, authenticateToken
 */
const verifyToken = async (req, res, next) => {
  // B1: đọc header "Authorization: Bearer <token>". Không có header → 401.
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: 'Chưa có token xác thực' });
  }

  // B2: tách phần token (bỏ chữ "Bearer" đứng trước). Thiếu token → 401.
  const token = header.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }

  try {
    // B3: verify chữ ký + hạn của JWT → lấy payload (chứa user_id, role...).
    const payload = verifyAccessToken(token);
    // B4: tải user từ DB để kiểm tra realtime (có thể đã bị khóa/vô hiệu hóa sau khi cấp token).
    const { user, blocked, message } = await loadActiveUser(payload.user_id);
    if (blocked) {
      return res.status(403).json({ message });
    }

    // B5: gắn danh tính vào req để controller phía sau dùng.
    req.userId = user.user_id;
    req.userRole = user.role;
    req.user = {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      branch_id: user.branch_id || null,
    };
    next();
  } catch (error) {
    // Token sai chữ ký hoặc hết hạn → 403.
    return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

/** [PHÂN QUYỀN] Chặn route chỉ admin được vào. Ctrl+F: isAdmin */
const isAdmin = (req, res, next) => {
  if (!req.userRole) {
    return res.status(401).json({ message: 'Vui lòng đăng nhập' });
  }
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có quyền truy cập' });
  }
  next();
};

/**
 * [ADMIN] Verify token và role=admin trong một bước, dùng cho màn quản trị toàn chuỗi.
 * Ctrl+F: verifyAdmin, admin only
 */
const verifyAdmin = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: 'Chưa có token xác thực' });
  }
  const token = header.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
  try {
    const payload = verifyAccessToken(token);
    if (payload.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }
    const { user, blocked, message } = await loadActiveUser(payload.user_id);
    if (blocked) {
      return res.status(403).json({ message });
    }
    req.userId = user.user_id;
    req.userRole = user.role;
    req.user = {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      branch_id: user.branch_id || null,
    };
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

/**
 * [PHÂN QUYỀN] Cho phép nhiều role vào cùng route, ví dụ admin/manager/waiter/kitchen.
 * Ctrl+F: authorizeRole, allowedRoles
 */
const authorizeRole = (...allowedRoles) => {
  // Trả về middleware "đóng gói" danh sách role được phép (dùng sau verifyToken).
  return (req, res, next) => {
    // Lấy role đã được verifyToken gắn trước đó; chưa có nghĩa là chưa đăng nhập.
    const role = req.userRole || (req.user && req.user.role);
    if (!role) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập' });
    }
    // Role không nằm trong whitelist → cấm truy cập.
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập chức năng này' });
    }
    next();
  };
};

// Alias giữ tên cũ cho các route đang import authenticateToken.
const authenticateToken = verifyToken;

module.exports = {
  verifyToken,
  authenticateToken,
  verifyAdmin,
  isAdmin,
  authorizeRole,
};
