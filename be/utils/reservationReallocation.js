/**
 * BỘ GIẢI TÁI PHÂN BỔ BÀN — tìm phương án chung cho booking cũ và yêu cầu mới.
 *
 * Utility này không truy cập database. Service chịu trách nhiệm khóa dữ liệu,
 * nạp booking hợp lệ và áp dụng kết quả trong cùng transaction.
 */
const { generateTableAllocationPlans } = require("./tableAllocation");

const DEFAULT_MAX_SEARCH_NODES = 100000;

function normalizeIds(ids) {
  return [...new Set((ids || []).map(Number).filter(Number.isFinite))].sort(
    (a, b) => a - b
  );
}

function sameTableSet(left, right) {
  const a = normalizeIds(left);
  const b = normalizeIds(right);
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function windowsOverlap(left, right) {
  return new Date(left.windowStart) < new Date(right.windowEnd) &&
    new Date(left.windowEnd) > new Date(right.windowStart);
}

function plansConflict(leftBooking, leftPlan, rightBooking, rightPlan) {
  if (!windowsOverlap(leftBooking, rightBooking)) return false;
  const occupied = new Set(leftPlan.tableIds);
  return rightPlan.tableIds.some((id) => occupied.has(id));
}

function planCost(booking, plan) {
  const moved =
    !booking.isNew &&
    !booking.fixed &&
    !sameTableSet(booking.currentTableIds, plan.tableIds)
      ? 1
      : 0;
  return {
    moved,
    tables: plan.tableIds.length,
    waste: plan.waste || 0,
    span: plan.span || 0,
  };
}

function addCost(left, right) {
  return {
    moved: left.moved + right.moved,
    tables: left.tables + right.tables,
    waste: left.waste + right.waste,
    span: left.span + right.span,
  };
}

function compareCost(left, right) {
  if (!right) return -1;
  for (const key of ["moved", "tables", "waste", "span"]) {
    if (left[key] !== right[key]) return left[key] - right[key];
  }
  return 0;
}

function toCandidate(plan) {
  return {
    tableIds: normalizeIds(plan.tables.map((table) => table.table_id)),
    tables: plan.tables,
    waste: plan.waste || 0,
    span: plan.span || 0,
  };
}

function buildCandidates(booking, tables, tableById) {
  if (booking.fixed) {
    const tableIds = normalizeIds(booking.currentTableIds);
    if (!tableIds.length || tableIds.some((id) => !tableById.has(id))) return [];
    return [
      {
        tableIds,
        tables: tableIds.map((id) => tableById.get(id)),
        waste: 0,
        span: 0,
      },
    ];
  }

  const allocatableTables = tables.filter((table) => table.isAllocatable !== false);
  const candidates = generateTableAllocationPlans(booking.guests, allocatableTables).map(toCandidate);
  return candidates.sort((left, right) => {
    const leftCurrent = sameTableSet(left.tableIds, booking.currentTableIds) ? 0 : 1;
    const rightCurrent = sameTableSet(right.tableIds, booking.currentTableIds) ? 0 : 1;
    if (leftCurrent !== rightCurrent) return leftCurrent - rightCurrent;
    return compareCost(planCost(booking, left), planCost(booking, right));
  });
}

/**
 * Tìm phương án có thứ tự ưu tiên:
 * 1) di chuyển ít booking cũ nhất; 2) dùng ít bàn; 3) thừa ít ghế;
 * 4) chọn cụm bàn gọn hơn.
 */
function findBestReservationAllocation({
  bookings,
  tables,
  maxSearchNodes = DEFAULT_MAX_SEARCH_NODES,
}) {
  if (!bookings?.length || !tables?.length) return null;

  const tableById = new Map(tables.map((table) => [Number(table.table_id), table]));
  const prepared = bookings.map((booking) => ({
    ...booking,
    currentTableIds: normalizeIds(booking.currentTableIds),
    candidates: buildCandidates(booking, tables, tableById),
  }));
  if (prepared.some((booking) => booking.candidates.length === 0)) return null;

  // Booking ít lựa chọn được xét trước để cắt nhánh sớm; fixed luôn đứng đầu.
  prepared.sort((left, right) => {
    if (left.fixed !== right.fixed) return left.fixed ? -1 : 1;
    if (left.candidates.length !== right.candidates.length) {
      return left.candidates.length - right.candidates.length;
    }
    return Number(right.guests || 0) - Number(left.guests || 0);
  });

  let visitedNodes = 0;
  let bestCost = null;
  let bestAssignments = null;

  function search(index, assignments, cost) {
    visitedNodes += 1;
    if (visitedNodes > maxSearchNodes) return;
    if (bestCost && compareCost(cost, bestCost) >= 0) return;

    if (index === prepared.length) {
      bestCost = cost;
      bestAssignments = [...assignments];
      return;
    }

    const booking = prepared[index];
    for (const candidate of booking.candidates) {
      const conflict = assignments.some((assignment) =>
        plansConflict(booking, candidate, assignment.booking, assignment.plan)
      );
      if (conflict) continue;

      search(
        index + 1,
        [...assignments, { booking, plan: candidate }],
        addCost(cost, planCost(booking, candidate))
      );
    }
  }

  search(0, [], { moved: 0, tables: 0, waste: 0, span: 0 });
  if (!bestAssignments) return null;

  return {
    assignments: bestAssignments.map(({ booking, plan }) => ({
      bookingId: booking.id,
      isNew: Boolean(booking.isNew),
      tableIds: plan.tableIds,
    })),
    cost: bestCost,
    visitedNodes,
  };
}

module.exports = {
  DEFAULT_MAX_SEARCH_NODES,
  findBestReservationAllocation,
  sameTableSet,
  windowsOverlap,
};
