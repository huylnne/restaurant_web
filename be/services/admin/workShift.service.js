/**
 * SERVICE ADMIN WORK SHIFT — quản lý lịch ca làm việc nhân viên theo chi nhánh.
 * Ctrl+F: workShift service, listWorkShifts, createWorkShift, getOnDutyWaiters
 */
const { WorkShift, Employee, User } = require("../../models");
const { Op } = require("sequelize");
const { validateShiftTimes, isWithinShift } = require("../../utils/workShiftTime");

const employeeInclude = {
  model: Employee,
  attributes: ["employee_id", "position", "status"],
  include: [
    {
      model: User,
      attributes: ["user_id", "full_name", "phone", "role"],
    },
  ],
};

function mapShiftRow(row) {
  const data = row.toJSON ? row.toJSON() : row;
  const user = data.Employee?.User;
  return {
    ...data,
    employee_name: user?.full_name || null,
    employee_phone: user?.phone || null,
    employee_role: user?.role || null,
    waiter_user_id: user?.user_id || null,
  };
}

class WorkShiftService {
  /** Danh sách ca làm theo chi nhánh + khoảng ngày. */
  async listWorkShifts(
    branchId,
    { startDate, endDate, employeeId, page = 1, limit = 50 } = {}
  ) {
    const where = { branch_id: branchId };
    if (employeeId) where.employee_id = employeeId;

    if (startDate && endDate) {
      where.shift_date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.shift_date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.shift_date = { [Op.lte]: endDate };
    }

    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.max(1, Math.min(200, Number(limit) || 50));
    const offset = (parsedPage - 1) * parsedLimit;

    const { count, rows } = await WorkShift.findAndCountAll({
      where,
      include: [employeeInclude],
      order: [
        ["shift_date", "ASC"],
        ["start_time", "ASC"],
      ],
      limit: parsedLimit,
      offset,
    });

    return {
      shifts: rows.map(mapShiftRow),
      total: count,
      totalPages: Math.ceil(count / parsedLimit),
      currentPage: parsedPage,
    };
  }

  async getWorkShiftById(shiftId) {
    const shift = await WorkShift.findByPk(shiftId, { include: [employeeInclude] });
    if (!shift) {
      const err = new Error("Không tìm thấy ca làm việc");
      err.code = "NOT_FOUND";
      throw err;
    }
    return mapShiftRow(shift);
  }

  async createWorkShift(data) {
    const { employee_id, branch_id, shift_date, start_time, end_time, note } = data;
    validateShiftTimes(start_time, end_time);

    const employee = await Employee.findOne({
      where: { employee_id, branch_id },
      include: [{ model: User, attributes: ["user_id", "full_name"] }],
    });
    if (!employee) {
      const err = new Error("Nhân viên không thuộc chi nhánh này");
      err.code = "INVALID_EMPLOYEE";
      throw err;
    }

    const overlap = await WorkShift.findOne({
      where: {
        employee_id,
        shift_date,
        [Op.or]: [
          {
            start_time: { [Op.lt]: end_time },
            end_time: { [Op.gt]: start_time },
          },
        ],
      },
    });
    if (overlap) {
      const err = new Error("Nhân viên đã có ca trùng thời gian trong ngày này");
      err.code = "SHIFT_OVERLAP";
      throw err;
    }

    const shift = await WorkShift.create({
      employee_id,
      branch_id,
      shift_date,
      start_time,
      end_time,
      note: note || null,
    });

    return this.getWorkShiftById(shift.shift_id);
  }

  async updateWorkShift(shiftId, data) {
    const shift = await WorkShift.findByPk(shiftId);
    if (!shift) {
      const err = new Error("Không tìm thấy ca làm việc");
      err.code = "NOT_FOUND";
      throw err;
    }

    const start_time = data.start_time ?? shift.start_time;
    const end_time = data.end_time ?? shift.end_time;
    validateShiftTimes(start_time, end_time);

    const employee_id = data.employee_id ?? shift.employee_id;
    const branch_id = data.branch_id ?? shift.branch_id;
    const shift_date = data.shift_date ?? shift.shift_date;

    if (employee_id !== shift.employee_id || branch_id !== shift.branch_id) {
      const employee = await Employee.findOne({
        where: { employee_id, branch_id },
      });
      if (!employee) {
        const err = new Error("Nhân viên không thuộc chi nhánh này");
        err.code = "INVALID_EMPLOYEE";
        throw err;
      }
    }

    const overlap = await WorkShift.findOne({
      where: {
        shift_id: { [Op.ne]: shiftId },
        employee_id,
        shift_date,
        start_time: { [Op.lt]: end_time },
        end_time: { [Op.gt]: start_time },
      },
    });
    if (overlap) {
      const err = new Error("Nhân viên đã có ca trùng thời gian trong ngày này");
      err.code = "SHIFT_OVERLAP";
      throw err;
    }

    await shift.update({
      employee_id,
      branch_id,
      shift_date,
      start_time,
      end_time,
      note: data.note !== undefined ? data.note : shift.note,
    });

    return this.getWorkShiftById(shiftId);
  }

  async deleteWorkShift(shiftId) {
    const shift = await WorkShift.findByPk(shiftId);
    if (!shift) {
      const err = new Error("Không tìm thấy ca làm việc");
      err.code = "NOT_FOUND";
      throw err;
    }
    await shift.destroy();
    return { message: "Đã xóa ca làm việc" };
  }

  /** Danh sách waiter đang trong ca (hoặc có ca hôm nay) — dùng cho gán bàn. */
  async getOnDutyWaiters(branchId, at = new Date()) {
    const dateStr = at.toISOString().slice(0, 10);
    const shifts = await WorkShift.findAll({
      where: { branch_id: branchId, shift_date: dateStr },
      include: [
        {
          model: Employee,
          where: { status: "active", position: { [Op.in]: ["waiter", "cashier"] } },
          required: true,
          include: [
            {
              model: User,
              attributes: ["user_id", "full_name", "phone", "role"],
              where: { role: { [Op.in]: ["waiter", "admin"] }, is_active: true },
            },
          ],
        },
      ],
      order: [["start_time", "ASC"]],
    });

    const seen = new Set();
    const waiters = [];
    for (const shift of shifts) {
      const mapped = mapShiftRow(shift);
      const userId = mapped.waiter_user_id;
      if (!userId || seen.has(userId)) continue;
      seen.add(userId);
      waiters.push({
        user_id: userId,
        full_name: mapped.employee_name,
        phone: mapped.employee_phone,
        employee_id: mapped.employee_id,
        on_shift: isWithinShift(mapped, at),
        shift: {
          shift_id: mapped.shift_id,
          start_time: mapped.start_time,
          end_time: mapped.end_time,
        },
      });
    }

    return waiters;
  }

  /** Nhân viên active của chi nhánh (để chọn khi tạo ca). */
  async getBranchEmployees(branchId) {
    const rows = await Employee.findAll({
      where: { branch_id: branchId, status: "active" },
      include: [{ model: User, attributes: ["user_id", "full_name", "phone", "role"] }],
      order: [["position", "ASC"]],
    });
    return rows.map((row) => {
      const data = row.toJSON();
      return {
        employee_id: data.employee_id,
        position: data.position,
        full_name: data.User?.full_name,
        phone: data.User?.phone,
        user_id: data.User?.user_id,
        role: data.User?.role,
      };
    });
  }
}

module.exports = new WorkShiftService();
