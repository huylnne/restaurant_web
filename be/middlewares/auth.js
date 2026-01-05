const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: 'Chưa có token xác thực' });
  }

  const token = header.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.user_id;
    req.userRole = payload.role;
    req.user = payload; // Thêm dòng này
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

const verifyAdmin = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: 'Chưa có token xác thực' });
  }

  const token = header.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    if (payload.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
    }
    
    req.userId = payload.user_id;
    req.userRole = payload.role;
    req.user = payload;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

module.exports = {
  verifyToken,
  verifyAdmin,
  isAdmin
};