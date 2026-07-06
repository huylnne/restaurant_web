/**
 * CONTROLLER ADMIN REVIEW — HTTP layer danh sách/tổng quan đánh giá khách hàng.
 * Ctrl+F: admin review controller, getReviews, getReviewSummary, đánh giá admin
 * Luồng demo: Phần 5 — Bước 5.7 tìm review vừa gửi.
 */
const reviewService = require("../../services/admin/review.service");
const { resolveBranchId } = require("../../utils/branchScope");

/** [ĐÁNH GIÁ] Danh sách review theo branch/date/rating/search. Ctrl+F: getReviews */
exports.getReviews = async (req, res) => {
  try {
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const data = await reviewService.listReviews(branchId, req.query || {});
    return res.json(data);
  } catch (error) {
    console.error("Lỗi getReviews:", error);
    return res.status(500).json({ message: "Không thể lấy danh sách đánh giá" });
  }
};

/** [ĐÁNH GIÁ] Tổng hợp số lượng review và điểm trung bình. Ctrl+F: getReviewSummary */
exports.getReviewSummary = async (req, res) => {
  try {
    const branchId = resolveBranchId(req, req.query.branchId, 1);
    const data = await reviewService.getReviewSummary(branchId, req.query || {});
    return res.json(data);
  } catch (error) {
    console.error("Lỗi getReviewSummary:", error);
    return res.status(500).json({ message: "Không thể lấy tổng quan đánh giá" });
  }
};
