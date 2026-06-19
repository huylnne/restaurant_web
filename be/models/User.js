module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'user_id',
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'branches', key: 'branch_id' },
      },
      username: {
        type: DataTypes.STRING(30),
        unique: true,
        allowNull: false,
      },
      password_hash: {
        type: DataTypes.STRING(60),
        allowNull: false,
        comment: 'Hash bcrypt (60 ký tự)',
      },
      full_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(10),
        allowNull: true,
        unique: true,
        comment: 'SĐT Việt Nam: 10 chữ số, bắt đầu bằng 0',
      },
      role: {
        type: DataTypes.ENUM('admin', 'waiter', 'kitchen', 'manager', 'user'),
        allowNull: false,
      },
      avatar_url: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue:
          'https://tse3.mm.bing.net/th/id/OIP.aCwqDO1MIaS3qzA7DyFPdAHaHa?pid=Api&P=0&h=180',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      locked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'users',
      timestamps: false,
    }
  );

  return User;
};
