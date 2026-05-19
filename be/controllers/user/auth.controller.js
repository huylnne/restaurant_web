const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const db = require("../../models/db");
const User = db.User;
const { signAccessToken } = require("../../utils/jwt");
const { getAccountBlockMessage } = require("../../utils/userAccount");
const { PHONE_REGEX } = require("../../middlewares/validateAuthInput");

const DEFAULT_AVATAR_URL = "https://tse3.mm.bing.net/th/id/OIP.aCwqDO1MIaS3qzA7DyFPdAHaHa?pid=Api&P=0&h=180";

const register = async (req, res) => {
  try {
    const { username, password, full_name, phone } = req.body;

    const existingUser = await User.findOne({
      where: { username: { [Op.iLike]: username } },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Tên đăng nhập đã tồn tại" });
    }

    const existingPhone = await User.findOne({ where: { phone } });
    if (existingPhone) {
      return res.status(400).json({ message: "Số điện thoại này đã được đăng ký" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      where: { username: { [Op.iLike]: username } },
    });

    if (!user) {
      return res.status(401).json({ message: "Tài khoản hoặc mật khẩu không đúng" });
    }

    const blockMsg = getAccountBlockMessage(user);
    if (blockMsg) {
      return res.status(403).json({ message: blockMsg });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Tài khoản hoặc mật khẩu không đúng" });
    }

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
  const config = captchaService.getPublicConfig();
  if (config.provider !== "math") {
    return res.status(400).json({
      message: "CAPTCHA dạng phép tính chỉ dùng khi chưa cấu hình reCAPTCHA/Turnstile",
    });
  }
  res.json(captchaService.createMathChallenge());
};

module.exports = { register, login, checkPhone, getCaptchaConfig, getCaptchaChallenge };
