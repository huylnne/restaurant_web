const express = require("express");
const router = express.Router();
const reviewController = require("../../controllers/admin/review.controller");
const { verifyToken, authorizeRole } = require("../../middlewares/auth");

// Manager chỉ được xem đúng chi nhánh của mình
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

router.use(verifyToken, authorizeRole("admin", "manager"), enforceReviewBranchScope);
router.get("/", reviewController.getReviews);
router.get("/summary", reviewController.getReviewSummary);

module.exports = router;
