/**
 * MODEL WORK_SHIFT — bảng work_shifts lưu lịch ca làm việc của nhân viên theo ngày.
 * Ctrl+F: WorkShift model, work_shifts, shift_date, start_time, end_time
 */
module.exports = (sequelize, DataTypes) => {
  const WorkShift = sequelize.define(
    "WorkShift",
    {
      shift_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      employee_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "employees", key: "employee_id" },
      },
      branch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "branches", key: "branch_id" },
      },
      shift_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: "Ngày làm việc (YYYY-MM-DD)",
      },
      start_time: {
        type: DataTypes.STRING(5),
        allowNull: false,
        comment: "Giờ bắt đầu ca (HH:MM)",
      },
      end_time: {
        type: DataTypes.STRING(5),
        allowNull: false,
        comment: "Giờ kết thúc ca (HH:MM)",
      },
      note: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
    },
    {
      tableName: "work_shifts",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return WorkShift;
};
