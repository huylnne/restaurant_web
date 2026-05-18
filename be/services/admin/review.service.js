const { Sequelize } = require("sequelize");
const db = require("../../models/db");

const reviewService = {
  async listReviews(branchId, { startDate, endDate, rating, q, limit = 100 }) {
    const whereParts = ["r.branch_id = :branchId"];
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
        "(u.full_name ILIKE :q OR u.phone ILIKE :q OR rv.comment ILIKE :q OR CAST(rv.reservation_id AS TEXT) ILIKE :q)"
      );
      replacements.q = `%${String(q).trim()}%`;
    }

    const parsedLimit = Math.max(1, Math.min(500, Number(limit) || 100));
    replacements.limit = parsedLimit;

    const query = `
      SELECT
        rv.review_id,
        rv.reservation_id,
        rv.user_id,
        rv.rating,
        rv.comment,
        rv.created_at,
        r.branch_id,
        r.reservation_time,
        r.number_of_guests,
        u.full_name,
        u.phone,
        t.table_number
      FROM reviews rv
      JOIN reservations r ON r.reservation_id = rv.reservation_id
      JOIN users u ON u.user_id = rv.user_id
      LEFT JOIN tables t ON t.table_id = r.table_id
      WHERE ${whereParts.join(" AND ")}
      ORDER BY rv.created_at DESC
      LIMIT :limit
    `;

    return db.sequelize.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    });
  },

  async getReviewSummary(branchId, { startDate, endDate }) {
    const whereParts = ["r.branch_id = :branchId"];
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
      JOIN reservations r ON r.reservation_id = rv.reservation_id
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
