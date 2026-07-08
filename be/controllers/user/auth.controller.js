/**
 * CONTROLLER XÁC THỰC — đăng ký, đăng nhập, CAPTCHA, kiểm tra SĐT.
 * Ctrl+F: đăng ký, register, login, CAPTCHA
 * Luồng demo: Phần 1 — /register, /login
 */
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const db = require("../../models/db");
const User = db.User;
const { signAccessToken } = require("../../utils/jwt");
const { getAccountBlockMessage } = require("../../utils/userAccount");
const { PHONE_REGEX } = require("../../middlewares/validateAuthInput");

const DEFAULT_AVATAR_URL = "https://tse3.mm.bing.net/th/id/OIP.aCwqDO1MIaS3qzA7DyFPdAHaHa?pid=Api&P=0&h=180";

/**
 * [ĐĂNG KÝ] POST /api/auth/register — tạo user role=user, ghi nhật ký audit.
 * Luồng demo: Phần 1 — Bước 1.2 (demo_khach01). Ctrl+F: register
 */
const register = async (req, res) => {
  try {
    const { username, password, full_name, phone } = req.body;

    // B1: chống trùng username (so sánh không phân biệt hoa/thường bằng iLike).
    const existingUser = await User.findOne({
      where: { username: { [Op.iLike]: username } },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Tên đăng nhập đã tồn tại" });
    }

    // B2: chống trùng số điện thoại (mỗi SĐT chỉ đăng ký 1 tài khoản).
    const existingPhone = await User.findOne({ where: { phone } });
    if (existingPhone) {
      return res.status(400).json({ message: "Số điện thoại này đã được đăng ký" });
    }

    // B3: KHÔNG lưu mật khẩu thô — băm bcrypt với cost 10 (salt tự sinh) trước khi ghi DB.
    const hashedPassword = await bcrypt.hash(password, 10);

    // B4: tạo user role=user, chưa gắn chi nhánh, mặc định đang hoạt động & không khóa.
    const newUser = await User.create({
      username,
      password_hash: hashedPassword,
      full_name,
      phone,
      avatar_url: DEFAULT_AVATAR_URL,
      branch_id: null,
      role: "user",
      is_active: true,
      locked: false,
    });

    // B5: gắn thông tin user vào req để middleware ghi nhật ký (audit) biết ai vừa thao tác.
    req.userId = newUser.user_id;
    req.userRole = newUser.role;
    req.user = {
      user_id: newUser.user_id,
      username: newUser.username,
      role: newUser.role,
      branch_id: null,
    };
    req.audit = {
      entityId: newUser.user_id,
      description: `Đăng ký: ${newUser.username}`,
    };

    res.status(201).json({
      message: "Đăng ký thành công",
      user: {
        user_id: newUser.user_id,
        username: newUser.username,
        full_name: newUser.full_name,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("❌ Lỗi register:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

/**
 * [ĐĂNG NHẬP] POST /api/auth/login — JWT token, phân quyền role (user/waiter/admin...).
 * Ctrl+F: login, đăng nhập
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // B1: tìm user theo username (không phân biệt hoa/thường).
    const user = await User.findOne({
      where: { username: { [Op.iLike]: username } },
    });

    // Lưu ý bảo mật: dùng cùng 1 thông báo cho "không tồn tại" và "sai mật khẩu"
    // để không lộ username nào có thật.
    if (!user) {
      return res.status(401).json({ message: "Tài khoản hoặc mật khẩu không đúng" });
    }

    // B2: chặn tài khoản bị khóa/vô hiệu hóa trước khi kiểm tra mật khẩu.
    const blockMsg = getAccountBlockMessage(user);
    if (blockMsg) {
      return res.status(403).json({ message: blockMsg });
    }

    // B3: so mật khẩu người dùng nhập với hash lưu trong DB (bcrypt tự tách salt).
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Tài khoản hoặc mật khẩu không đúng" });
    }

    // B4: phát hành JWT chứa danh tính + vai trò + chi nhánh để phân quyền ở các API sau.
    const token = signAccessToken({
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      branch_id: user.branch_id || null,
    });

    req.userId = user.user_id;
    req.userRole = user.role;
    req.user = {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      branch_id: user.branch_id || null,
    };
    req.audit = {
      entityId: user.user_id,
      description: `Đăng nhập: ${user.username} (${user.role})`,
    };

    return res.json({
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || "2h",
      user: {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        branch_id: user.branch_id || null,
      },
    });
  } catch (error) {
    console.error(" Lỗi login:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

/** [ĐĂNG KÝ] GET — kiểm tra SĐT chưa dùng (validate form realtime). Ctrl+F: checkPhone */
const checkPhone = async (req, res) => {
  try {
    const phone = String(req.query.phone || "").trim();
    if (!phone) return res.status(400).json({ message: "Thiếu số điện thoại" });
    if (!PHONE_REGEX.test(phone)) {
      return res.status(400).json({
        message: "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0",
      });
    }
    const existing = await User.findOne({ where: { phone } });
    if (existing) {
      return res.status(409).json({ message: "Số điện thoại này đã được đăng ký" });
    }
    return res.status(200).json({ available: true });
  } catch (error) {
    console.error("❌ Lỗi check-phone:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const captchaService = require("../../services/captcha.service");

const getCaptchaConfig = (req, res) => {
  res.json(captchaService.getPublicConfig());
};

const getCaptchaChallenge = (req, res) => {
  res.json(captchaService.createCodeChallenge());
};

module.exports = { register, login, checkPhone, getCaptchaConfig, getCaptchaChallenge };
