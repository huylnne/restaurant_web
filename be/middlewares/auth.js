const jwt = require('jsonwebtoken');
module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Chưa có token' });

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    console.log("🎯 payload decoded:", payload);  // 👈 log test
    console.log('🎯 Token payload:', payload);
    console.log('✅ Gán userId vào req:', payload.user_id);
    req.userId = payload.user_id;
    next();
  } catch {
    res.status(403).json({ message: 'Token không hợp lệ' });
  }
};
