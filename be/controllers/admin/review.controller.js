const reviewService = require("../../services/admin/review.service");
const { resolveBranchId } = require("../../utils/branchScope");

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
