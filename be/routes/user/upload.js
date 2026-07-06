/**
 * ROUTES UPLOAD — API upload ảnh đơn giản cho avatar/menu image.
 * Ctrl+F: upload routes, multer, /uploads, imageUrl
 * Dùng bởi: cập nhật hồ sơ hoặc quản lý món nếu FE gửi ảnh.
 */
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// [UPLOAD] Cấu hình nơi lưu và tên file, tránh trùng bằng timestamp + random.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Thư mục lưu ảnh
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  },
});

/** [UPLOAD] Multer middleware lưu file vào thư mục uploads/. Ctrl+F: upload single image */
const upload = multer({ storage });

// [UPLOAD] Route upload 1 ảnh, field name là 'image', trả imageUrl cho frontend lưu DB.
router.post("/", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

module.exports = router;
