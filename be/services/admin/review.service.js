/**
 * SERVICE ADMIN REVIEW — query danh sách và tổng quan đánh giá theo chi nhánh.
 * Ctrl+F: admin review service, buildReviewFilters, listReviews, getReviewSummary
 * Luồng demo: Phần 5 — Admin tìm review vừa gửi sau bữa ăn.
 */
const { Sequelize } = require("sequelize");
const db = require("../../models/db");

/** [ĐÁNH GIÁ] Build SQL filter theo branch, ngày, rating, search tên/SĐT/comment/order. Ctrl+F: buildReviewFilters */
function buildReviewFilters(branchId, { startDate, endDate, rating, q }) {
  const whereParts = ["o.branch_id = :branchId"];
  const replacements = { branchId };

  if (startDate && endDate) {
    whereParts.push("rv.created_at BETWEEN :startDate AND :endDate");
    replacements.startDate = startDate;
    replacements.endDate = endDate;
  }

  const parsedRating = Number(rating);
  if (Number.isInteger(parsedRating) && parsedRating >= 1 && parsedRating <= 5) {
    whereParts.push("rv.rating = :rating");
    replacements.rating = parsedRating;
  }

  if (q && String(q).trim()) {
    whereParts.push(
      "(COALESCE(u.full_name, 'Khách QR') ILIKE :q OR u.phone ILIKE :q OR rv.comment ILIKE :q OR CAST(rv.order_id AS TEXT) ILIKE :q)"
    );
    replacements.q = `%${String(q).trim()}%`;
  }

  return { whereParts, replacements };
}

const reviewService = {
  /** [ĐÁNH GIÁ] Danh sách review có pagination cho màn /admin/reviews. Ctrl+F: listReviews */
  async listReviews(branchId, { startDate, endDate, rating, q, page = 1, limit = 10 }) {
    const { whereParts, replacements } = buildReviewFilters(branchId, {
      startDate,
      endDate,
      rating,
      q,
    });

    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.max(1, Math.min(100, Number(limit) || 10));
    const offset = (parsedPage - 1) * parsedLimit;

    replacements.limit = parsedLimit;
    replacements.offset = offset;

    const fromClause = `
      FROM reviews rv
      JOIN orders o ON o.order_id = rv.order_id
      LEFT JOIN users u ON u.user_id = rv.user_id
      LEFT JOIN tables t ON t.table_id = o.table_id
      WHERE ${whereParts.join(" AND ")}
    `;

    const countQuery = `
      SELECT COUNT(rv.review_id)::int AS total
      ${fromClause}
    `;

    const listQuery = `
      SELECT
        rv.review_id,
        rv.order_id,
        rv.order_id AS reservation_id,
        rv.user_id,
        rv.rating,
        rv.comment,
        rv.created_at,
        o.branch_id,
        o.arrival_time,
        o.arrival_time AS reservation_time,
        o.number_of_guests,
        COALESCE(u.full_name, 'Khách QR') AS full_name,
        u.phone,
        t.table_number
      ${fromClause}
      ORDER BY rv.created_at DESC
      LIMIT :limit OFFSET :offset
    `;

    const [countRows, reviews] = await Promise.all([
      db.sequelize.query(countQuery, {
        replacements,
        type: Sequelize.QueryTypes.SELECT,
      }),
      db.sequelize.query(listQuery, {
        replacements,
        type: Sequelize.QueryTypes.SELECT,
      }),
    ]);

    return {
      reviews,
      total: Number(countRows[0]?.total || 0),
    };
  },

  /** [ĐÁNH GIÁ] Tổng số review, điểm trung bình, số 5 sao và low rating. Ctrl+F: getReviewSummary service */
  async getReviewSummary(branchId, { startDate, endDate }) {
    const whereParts = ["o.branch_id = :branchId"];
    const replacements = { branchId };

    if (startDate && endDate) {
      whereParts.push("rv.created_at BETWEEN :startDate AND :endDate");
      replacements.startDate = startDate;
      replacements.endDate = endDate;
    }

    const query = `
      SELECT
        COUNT(rv.review_id)::int AS total_reviews,
        COALESCE(AVG(rv.rating), 0)::numeric(10,2) AS avg_rating,
        COUNT(*) FILTER (WHERE rv.rating = 5)::int AS five_star,
        COUNT(*) FILTER (WHERE rv.rating <= 2)::int AS low_rating
      FROM reviews rv
      JOIN orders o ON o.order_id = rv.order_id
      WHERE ${whereParts.join(" AND ")}
    `;

    const [row] = await db.sequelize.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    });

    return {
      totalReviews: Number(row?.total_reviews || 0),
      avgRating: Number(row?.avg_rating || 0),
      fiveStar: Number(row?.five_star || 0),
      lowRating: Number(row?.low_rating || 0),
    };
  },
};

module.exports = reviewService;
