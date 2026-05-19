const db = require('../models/db');
const User = db.User;
const { verifyAccessToken } = require('../utils/jwt');
const { getAccountBlockMessage } = require('../utils/userAccount');

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

const verifyToken = async (req, res, next) => {
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

const isAdmin = (req, res, next) => {
  if (!req.userRole) {
    return res.status(401).json({ message: 'Vui lòng đăng nhập' });
  }
  if (req.userRole !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có quyền truy cập' });
  }
  next();
};

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

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    const role = req.userRole || (req.user && req.user.role);
    if (!role) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập' });
    }
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập chức năng này' });
    }
    next();
  };
};

const authenticateToken = verifyToken;

module.exports = {
  verifyToken,
  authenticateToken,
  verifyAdmin,
  isAdmin,
  authorizeRole,
};
