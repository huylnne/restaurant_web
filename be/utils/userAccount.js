function getAccountBlockMessage(user) {
  if (!user) return 'Tài khoản không tồn tại';
  if (user.locked) {
    return 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.';
  }
  if (user.is_active === false) {
    return 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.';
  }
  return null;
}

module.exports = { getAccountBlockMessage };
