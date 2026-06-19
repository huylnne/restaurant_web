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

      order_id: {

        type: DataTypes.INTEGER,

        allowNull: false,

        unique: true,

        references: { model: 'orders', key: 'order_id' },

      },

      user_id: {

        type: DataTypes.INTEGER,

        allowNull: false,

        references: { model: 'users', key: 'user_id' },

      },

      rating: {

        type: DataTypes.INTEGER,

        allowNull: false,

        validate: { min: 1, max: 5 },

      },

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



  Review.associate = (models) => {

    Review.belongsTo(models.Order, { foreignKey: 'order_id' });

    Review.belongsTo(models.User, { foreignKey: 'user_id' });

  };



  return Review;

};

