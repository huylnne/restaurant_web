/**
 * UTIL USER ACCOUNT — kiểm tra tài khoản có được phép đăng nhập/thao tác không.
 * Ctrl+F: user account, getAccountBlockMessage, tài khoản bị khóa, is_active
 * Dùng bởi: auth.controller login, middleware auth, đặt bàn.
 */
function getAccountBlockMessage(user) {
  // Không tìm thấy user → coi như không tồn tại.
  if (!user) return 'Tài khoản không tồn tại';
  // locked = true: bị khóa (vd no-show nhiều lần) → chặn đăng nhập/thao tác.
  if (user.locked) {
    return 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.';
  }
  // is_active === false: admin vô hiệu hóa tài khoản.
  if (user.is_active === false) {
    return 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.';
  }
  // null = không bị chặn, được phép tiếp tục.
  return null;
}

module.exports = { getAccountBlockMessage };
