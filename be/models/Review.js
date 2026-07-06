/**
 * MODEL REVIEW — bảng reviews lưu đánh giá sau bữa ăn, mỗi order tối đa một review.
 * Ctrl+F: Review model, reviews, rating, REVIEW_ALREADY_EXISTS
 * Luồng demo: Phần 4 gửi đánh giá, Phần 5 Admin xem đánh giá.
 */
module.exports = (sequelize, DataTypes) => {

  const Review = sequelize.define(

    "Review",

    {

      review_id: {

        type: DataTypes.INTEGER,

        primaryKey: true,

        autoIncrement: true,

        allowNull: false,

      },

      // [ĐÁNH GIÁ] Review gắn unique với một order đã thanh toán/hoàn tất.
      order_id: {

        type: DataTypes.INTEGER,

        allowNull: false,

        unique: true,

        references: { model: 'orders', key: 'order_id' },

      },

      // [KHÁCH] Có thể null nếu khách đánh giá qua QR không đăng nhập.
      user_id: {

        type: DataTypes.INTEGER,

        allowNull: true,

        references: { model: 'users', key: 'user_id' },

      },

      // [ĐÁNH GIÁ] Số sao 1-5.
      rating: {

        type: DataTypes.INTEGER,

        allowNull: false,

        validate: { min: 1, max: 5 },

      },

      // [ĐÁNH GIÁ] Nội dung nhận xét của khách.
      comment: {

        type: DataTypes.TEXT,

        allowNull: false,

      },

      created_at: {

        type: DataTypes.DATE,

        allowNull: false,

        defaultValue: DataTypes.NOW,

      },

    },

    {

      tableName: "reviews",

      timestamps: false,

    }

  );



  // [QUAN HỆ] Review thuộc Order và tùy chọn thuộc User.
  Review.associate = (models) => {

    Review.belongsTo(models.Order, { foreignKey: 'order_id' });

    Review.belongsTo(models.User, { foreignKey: 'user_id' });

  };



  return Review;

};

