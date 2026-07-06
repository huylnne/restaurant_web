/**
 * UTIL USER ACCOUNT — kiểm tra tài khoản có được phép đăng nhập/thao tác không.
 * Ctrl+F: user account, getAccountBlockMessage, tài khoản bị khóa, is_active
 * Dùng bởi: auth.controller login, middleware auth, đặt bàn.
 */
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
