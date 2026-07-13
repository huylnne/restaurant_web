/**
 * ROUTES ADMIN REVIEW — API quản lý đánh giá khách hàng theo chi nhánh.
 * Ctrl+F: review routes, /admin/reviews, review summary
 * Luồng demo: Phần 5 — Bước 5.7 Admin xem đánh giá vừa gửi.
 */
const express = require("express");
const router = express.Router();
const reviewController = require("../../controllers/admin/review.controller");
const { verifyToken, authorizeRole } = require("../../middlewares/auth");

// [PHÂN QUYỀN CHI NHÁNH] Manager chỉ được xem đúng chi nhánh của mình.
const enforceReviewBranchScope = (req, res, next) => {
  const role = req.userRole || req.user?.role;
  if (role !== "manager") return next();

  const userBranchId = parseInt(req.user?.branch_id, 10);
  if (!Number.isFinite(userBranchId)) {
    return res
      .status(403)
      .json({ message: "Tài khoản manager chưa được gán chi nhánh" });
  }

  const requestedRaw = req.query.branchId;
  if (requestedRaw !== undefined) {
    const requestedBranchId = parseInt(requestedRaw, 10);
    if (Number.isFinite(requestedBranchId) && requestedBranchId !== userBranchId) {
      return res
        .status(403)
        .json({ message: "Manager chỉ được xem đánh giá của chi nhánh được phân công" });
    }
  }

  req.query.branchId = String(userBranchId);
  return next();
};

// [ĐÁNH GIÁ] Admin/manager xem review, manager bị ép branch_id.
router.use(verifyToken, authorizeRole("admin", "manager"), enforceReviewBranchScope);
// [ĐÁNH GIÁ] Danh sách review có filter ngày/rating/search.
router.get("/", reviewController.getReviews);
// [ĐÁNH GIÁ] Tổng hợp số sao/trung bình review.
router.get("/summary", reviewController.getReviewSummary);
router.get("/waiter-stats", reviewController.getWaiterReviewStats);

module.exports = router;
