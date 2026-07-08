import { normalizeTableStatus, getTableStatusLabel } from "@/constants/tableStatus";
import { computeBillTotals, collectOrderItemsFromRow } from "@/utils/billTotals";

/**
 * Gộp các đơn cùng booking_group_id (đặt bàn ghép nhiều bàn) thành MỘT dòng hiển thị,
 * tính luôn bill gộp — để danh sách không hiện trùng nhiều dòng cho cùng 1 lượt đặt.
 */
export function groupReservationsForDisplay(rows) {
  if (!rows?.length) return [];
  const seen = new Set(); // các group đã xử lý, tránh gộp lặp
  const result = [];

  for (const row of rows) {
    // Trường hợp row đã kèm sẵn mảng tables (backend gộp sẵn) → dùng trực tiếp.
    if (row.tables?.length) {
      const mergedOrderItems = row.OrderItems || [];
      const bill = computeBillTotals(mergedOrderItems);
      result.push({
        ...row,
        OrderItems: mergedOrderItems,
        groupTables: row.tables,
        groupOrderIds: [row.order_id],
        ...bill,
      });
      continue;
    }

    const gid = row.booking_group_id;
    // Không thuộc group nào → là đơn lẻ, tính bill riêng.
    if (!gid) {
      const bill = computeBillTotals(row.OrderItems || []);
      result.push({ ...row, ...bill });
      continue;
    }
    // Mỗi group chỉ xử lý 1 lần (các row còn lại cùng group sẽ bị skip).
    if (seen.has(gid)) continue;
    seen.add(gid);

    // Gom tất cả đơn cùng group: lấy đủ danh sách bàn, chọn order_id nhỏ nhất làm "đại diện" (primary),
    // gộp toàn bộ món để tính 1 bill chung.
    const group = rows.filter((r) => r.booking_group_id === gid);
    const tables = group.map((r) => r.Table).filter(Boolean);
    const primary = group.reduce((a, b) => (a.order_id < b.order_id ? a : b));
    const mergedOrderItems = group.flatMap((r) => r.OrderItems || []);
    const bill = computeBillTotals(mergedOrderItems);
    result.push({
      ...primary,
      OrderItems: mergedOrderItems,
      groupTables: tables,
      groupOrderIds: group.map((r) => r.order_id),
      ...bill,
    });
  }

  return result.sort((a, b) => new Date(b.arrival_time) - new Date(a.arrival_time));
}

export function getRowBill(row) {
  if (Array.isArray(row?.items) && row.items.length) {
    return {
      items: row.items,
      subtotal_before_discount: Number(row.subtotal_before_discount) || 0,
      discount_total: Number(row.discount_total) || 0,
      total_amount: Number(row.total_amount) || 0,
    };
  }
  return computeBillTotals(collectOrderItemsFromRow(row));
}

export function hasRowBill(row) {
  return getRowBill(row).items.length > 0;
}

export function getRowItemCount(row) {
  const items = getRowBill(row).items;
  return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}

export function formatBillMoney(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}

export function getReservationBillRoute(row) {
  return {
    name: "ReservationBill",
    params: { orderId: String(row.order_id) },
  };
}

/** Phiên còn phục vụ — cho phép gọi thêm món (đồng bộ với luồng quét QR tại bàn). */
export function canOrderMoreDishes(data) {
  if (!data) return false;

  // Chặn khi đơn đã kết thúc/đang chờ thanh toán → không cho gọi thêm.
  const resStatus = String(data.status ?? data.order?.status ?? "").toLowerCase();
  if (["cancelled", "completed", "no_show", "waiting_payment"].includes(resStatus)) {
    return false;
  }
  // Đã thanh toán xong cũng không cho gọi thêm.
  if (data.Payment?.status === "succeeded") return false;
  if (data.order?.payment_status === "paid") return false;

  // Xét trạng thái bàn (ưu tiên các nguồn khác nhau tùy shape dữ liệu).
  const tableStatus = normalizeTableStatus(
    data.Table?.status ??
      data.table?.status ??
      data.tables?.[0]?.status ??
      data.groupTables?.[0]?.status
  );

  // Bàn trống/đang dọn → không có phiên; bàn đang phục vụ/đã đặt → cho gọi.
  if (tableStatus === "available" || tableStatus === "cleaning") return false;
  if (tableStatus === "occupied" || tableStatus === "pre-ordered") return true;
  if (resStatus === "in_progress") return true;

  // Trường hợp mập mờ: đơn "confirmed" đã có món/tiền cũng cho gọi thêm.
  const hasItems = Boolean(
    (data.items ?? data.OrderItems ?? []).length || Number(data.total_amount) > 0
  );
  return hasItems && resStatus === "confirmed";
}

export function getOrderMoreRoute(data, options = {}) {
  const orderId = data?.order_id ?? data?.order?.order_id;
  if (!orderId) return null;

  const branchId = data?.branch_id ?? data?.order?.branch_id;
  const query = {
    order_id: String(orderId),
    mode: "add",
  };
  if (branchId) query.branch_id = String(branchId);
  if (options.returnTo) query.return_to = options.returnTo;

  return { name: "OrderMenu", query };
}

export function getDiningStatusLabel(row) {
  const resStatus = (row.status || "").trim().toLowerCase();
  const tableStatus = normalizeTableStatus(row.Table?.status);

  if (resStatus === "cancelled") return "Đã hủy";
  if (resStatus === "no_show") return "Vắng mặt";
  if (resStatus === "completed") return "Đã xong";
  if (resStatus === "pending") return "Chờ xác nhận";
  if (resStatus === "waiting_payment") return "Chờ thanh toán";

  if (tableStatus === "occupied") return "Đang phục vụ";
  if (tableStatus === "pre-ordered") return "Đã đặt";
  if (tableStatus === "cleaning") return "Chờ dọn";
  if (resStatus === "confirmed") return "Đã xác nhận";

  return getTableStatusLabel(row.Table?.status) || row.status || "-";
}

export function formatCapacity(row) {
  if (row?.groupTables?.length) {
    const total = row.groupTables.reduce((s, t) => s + Number(t.capacity || 0), 0);
    return `${total} (${row.groupTables.length} bàn)`;
  }
  return row?.Table?.capacity ?? "-";
}

export function formatTableNumber(row) {
  if (row?.tables?.length) {
    return row.tables
      .map((t) => t.table_number)
      .filter((n) => n != null && n !== "")
      .sort((a, b) => a - b)
      .map((n) => `B${n}`)
      .join(", ");
  }
  if (row?.groupTables?.length) {
    return row.groupTables
      .map((t) => t.table_number)
      .filter((n) => n != null && n !== "")
      .sort((a, b) => a - b)
      .map((n) => `B${n}`)
      .join(", ");
  }
  const tableNumber = row?.Table?.table_number;
  if (tableNumber === null || tableNumber === undefined || tableNumber === "") {
    return "-";
  }
  return `B${tableNumber}`;
}
