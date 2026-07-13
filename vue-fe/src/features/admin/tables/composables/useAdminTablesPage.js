/**
 * useAdminTablesPage — "bộ não" của màn Quản lý bàn (sơ đồ bàn) cho admin/manager/waiter/kitchen.
 * Gộp toàn bộ nghiệp vụ tại quầy vào 1 composable:
 *  - Sơ đồ bàn: nạp danh sách bàn + thống kê, lọc/tìm, phân trang co giãn theo kích thước lưới.
 *  - CRUD bàn: thêm/sửa/xóa; waiter chỉ được đổi trạng thái bàn.
 *  - Chi tiết bàn: đơn món của bàn, hóa đơn (bill), trạng thái thanh toán, gọi món tại bàn, đánh dấu đã phục vụ.
 *  - Thanh toán: chốt tiền mặt/CK, tạo QR VietQR (tự poll), tải hóa đơn PDF.
 *  - Tiếp nhận (reception): check-in đơn đặt trước + xếp bàn cho khách vãng lai (walk-in).
 *  - Realtime: poll định kỳ + WebSocket theo chi nhánh để đồng bộ trạng thái bàn/bếp.
 */
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import axios from "axios";
import { useVietQrPayment } from "@/features/payments/composables/useVietQrPayment";
import { buildTableQrLink, createQrDataUrl } from "@/features/payments/utils/tableLinkQr";
import {
  normalizeTableStatus,
  getTableStatusLabel,
  getTableStatusClass,
  getTableTagType,
} from "@/constants/tableStatus";
import {
  isLegacyPreorderOrderStatus,
  normalizeOrderStatus,
  getOrderStatusLabel,
} from "@/constants/orderStatus";
import { connectBranchRealtime } from "@/utils/branchRealtime";
import {
  handleKitchenRealtimeMessage,
  notifyKitchenDishDone,
} from "@/utils/kitchenDoneAlert";
import { getCurrentUser } from "@/utils/adminScope";
import { API_ORIGIN } from "@/config/api";
import { TABLE_CAPACITY, MAX_GUESTS } from "@/constants/reservation";
import {
  formatCurrency,
  formatTime,
  formatDateTime,
  authHeaders,
} from "@/utils/format";
import { TABLE_API, WAITER_API, RECEPTION_API, BRANCH_API } from "../api/tablesApi";

export function useAdminTablesPage() {
  const tablesGridRef = ref(null);   // ref tới DOM lưới bàn (để đo kích thước)
  const tablePageSize = ref(36);     // số bàn/trang (được tính lại theo màn hình)
  let tablesGridResizeObserver = null;

  // Đọc 1 biến CSS dạng px (vd --hl-admin-grid-min) → số; lỗi thì trả về fallback.
  function readCssPxVar(name, fallback) {
    if (typeof document === "undefined") return fallback;
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  // Tính số bàn/trang sao cho lấp vừa vùng hiển thị: số cột × số hàng ước lượng.
  function computeTablePageSize() {
    const el = tablesGridRef.value;
    if (!el || typeof window === "undefined") return;
    const w = el.clientWidth;
    if (w < 80) return; // chưa render đủ rộng

    // Số cột = (bề rộng + gap) / (thẻ tối thiểu + gap).
    const minCard = readCssPxVar("--hl-admin-grid-min", 220);
    const gap = readCssPxVar("--hl-admin-grid-gap", 16);
    const cols = Math.max(1, Math.floor((w + gap) / (minCard + gap)));

    // Số hàng = chiều cao còn lại của viewport / chiều cao 1 thẻ (kẹp 3..14 hàng).
    const rect = el.getBoundingClientRect();
    const reserveBottom = 120;
    const availH = Math.max(240, window.innerHeight - rect.top - reserveBottom);
    const estRowH = 150;
    const rows = Math.max(3, Math.min(14, Math.floor(availH / estRowH)));

    // pageSize = cols*rows, kẹp trong khoảng 12..150.
    const next = Math.min(150, Math.max(12, cols * rows));
    if (tablePageSize.value !== next) {
      tablePageSize.value = next;
    }
  }

  // Kéo currentPage về trang cuối hợp lệ nếu nó vượt quá tổng số trang (sau khi lọc/đổi pageSize).
  function clampTablePage() {
    const total = filteredTables.value?.length || 0;
    const maxPage = Math.max(1, Math.ceil(total / tablePageSize.value));
    if (tableCurrentPage.value > maxPage) {
      tableCurrentPage.value = maxPage;
    }
  }

  // Gọi mỗi khi lưới đổi kích thước: tính lại pageSize rồi kẹp lại trang.
  function onTablesGridLayoutTick() {
    computeTablePageSize();
    clampTablePage();
  }

  // --- State cơ bản: vai trò, chi nhánh, danh sách bàn ---
  const userRole = ref("");          // vai trò người đăng nhập (admin/manager/waiter/kitchen)
  const branches = ref([]);          // danh sách chi nhánh
  const selectedBranchId = ref(1);   // chi nhánh đang xem
  const tables = ref([]);            // toàn bộ bàn của chi nhánh (chưa lọc)
  const filteredTables = ref([]);    // danh sách bàn sau khi lọc/tìm
  const summary = ref({              // các con số thống kê hiển thị ở đầu trang

    totalTables: 0,
    availableTables: 0,
    occupiedTables: 0,
    reservedTables: 0,
    cleaningTables: 0,
    currentRevenue: 0,
  });

  // --- State lọc + các dialog ---
  const searchQuery = ref("");           // ô tìm theo số bàn
  const filterStatus = ref("");          // lọc theo trạng thái bàn
  const tableCurrentPage = ref(1);       // trang hiện tại của lưới bàn
  const showAddDialog = ref(false);      // dialog thêm bàn
  const showDetailDialog = ref(false);   // dialog chi tiết bàn
  const showEditDialogVisible = ref(false); // dialog sửa bàn
  const selectedTable = ref(null);       // bàn đang được chọn/mở chi tiết

  // --- State cho QR (2 chế độ: link đặt món của bàn HOẶC QR thanh toán VietQR) ---
  const showQrDialog = ref(false);
  const qrSelectedTable = ref(null);
  const linkQrDataUrl = ref("");   // ảnh QR của link bàn (/t/{token})
  const qrLink = ref("");          // chuỗi link bàn
  const qrMode = ref("link");      // "link" | "payment"
  const {
    qrDataUrl: paymentQrDataUrl,
    amount: qrPaymentAmount,
    paymentCode: qrPaymentCode,
    orderId: qrPaymentOrderId,
    status: qrPaymentStatus,
    createPaymentQr,
    stopPolling: stopQrPaymentPolling,
    reset: resetVietQrPayment,
  } = useVietQrPayment();
  // Ảnh QR hiển thị tùy chế độ: thanh toán → QR VietQR; ngược lại → QR link bàn.
  const qrDataUrl = computed(() =>
    qrMode.value === "payment" ? paymentQrDataUrl.value : linkQrDataUrl.value
  );

  // --- State chi tiết bàn: đơn món, tạo đơn tại bàn ---
  const tableOrders = ref([]);           // các đơn của bàn đang mở
  const tableOrdersLoading = ref(false);
  const showCreateOrderDialog = ref(false);
  const menuItemsForOrder = ref([]);     // thực đơn để chọn khi tạo đơn tại bàn
  const menuItemsLoading = ref(false);
  const orderQuantities = ref({});       // map item_id → số lượng đang chọn

  // --- State hóa đơn + thanh toán ---
  const tableBill = ref(null);           // bill tổng hợp của bàn
  const tableBillLoading = ref(false);
  const paymentInfo = ref(null);         // thông tin bản ghi payment (nếu có)
  const paymentLoading = ref(false);
  const paymentMethod = ref("CASH");     // phương thức thanh toán đang chọn
  const paymentSubmitting = ref(false);

  const paymentMethodOptions = [
    { value: "CASH", label: "Tiền mặt" },
    { value: "BANK_TRANSFER", label: "Chuyển khoản" },
    { value: "SEPAY", label: "SEPay" },
    { value: "CARD", label: "Thẻ" },
    { value: "WALLET", label: "Ví điện tử" },
  ];

  // Có ít nhất 1 món được chọn (số lượng > 0) → cho phép bấm "Tạo đơn".
  const hasOrderItemsSelected = computed(() =>
    Object.values(orderQuantities.value).some((qty) => qty > 0)
  );

  // Các đơn đặt món trước (pre-order) theo trạng thái cũ — dùng để hiển thị riêng.
  const legacyPreOrders = computed(() =>
    tableOrders.value.filter((o) => isLegacyPreorderOrderStatus(o.status))
  );
  const preOrders = legacyPreOrders;

  // Form thêm bàn mới (sức chứa mặc định lấy từ hằng số).
  const newTable = ref({
    table_number: null,
    capacity: TABLE_CAPACITY,
  });

  // Form sửa bàn.
  const editTableForm = ref({
    table_number: null,
    capacity: null,
    status: "",
  });

  // --- State cho dialog Tiếp nhận (reception): 2 tab reservation | walkin ---
  const showReceptionDialog = ref(false);
  const receptionTab = ref("reservation");   // tab đang mở
  const receptionSearchQuery = ref("");       // ô tìm đặt bàn (SĐT/tên/mã)
  const receptionResults = ref([]);           // kết quả tìm / danh sách sắp tới
  const receptionSearchLoading = ref(false);
  const receptionSearched = ref(false);       // đã bấm tìm hay chưa (để hiện "không có kết quả")
  const receptionConfirmLoading = ref(null);  // order_id đang check-in (để loading nút riêng)
  const walkInGuests = ref(2);                // số khách vãng lai
  const walkInTables = ref([]);               // bàn trống gợi ý cho walk-in
  const walkInTablesLoading = ref(false);
  const walkInSelectedTableIds = ref([]);     // các bàn đã chọn để ghép cho nhóm khách
  const walkInSubmitLoading = ref(false);

  const branchWaiters = ref([]);
  const branchWaitersLoading = ref(false);
  const selectedWaiterUserId = ref(null);
  const assignWaiterLoading = ref(false);

  const activeSessionOrderId = computed(() => {
    const fromOrders = tableOrders.value.find((o) => o.order_id);
    if (fromOrders?.order_id) return fromOrders.order_id;
    return selectedTable.value?.activeOrder?.order_id || null;
  });

  const currentAssignedWaiter = computed(() => {
    const order = tableOrders.value[0];
    if (order?.AssignedWaiter) return order.AssignedWaiter;
    if (order?.assigned_waiter) return order.assigned_waiter;
    return (
      selectedTable.value?.assigned_waiter ||
      selectedTable.value?.activeOrder?.assigned_waiter ||
      selectedTable.value?.activeOrder?.AssignedWaiter ||
      null
    );
  });

  // Tổng sức chứa của các bàn đã chọn cho walk-in.
  const walkInSelectedCapacity = computed(() =>
    walkInTables.value
      .filter((table) => walkInSelectedTableIds.value.includes(table.table_id))
      .reduce((sum, table) => sum + Number(table.capacity || 0), 0)
  );

  // Đã chọn đủ bàn để chứa hết nhóm khách chưa?
  const hasEnoughWalkInCapacity = computed(
    () =>
      walkInSelectedTableIds.value.length > 0 &&
      walkInSelectedCapacity.value >= Number(walkInGuests.value || 0)
  );

  // Nạp danh sách chi nhánh; nếu chi nhánh đang chọn không còn → chọn chi nhánh đầu tiên.
  const fetchBranches = async () => {
    try {
      const response = await axios.get(BRANCH_API);
      branches.value = Array.isArray(response.data) ? response.data : [];
      if (branches.value.length > 0) {
        const hasSelected = branches.value.some((b) => b.branch_id === selectedBranchId.value);
        if (!hasSelected) selectedBranchId.value = branches.value[0].branch_id;
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách chi nhánh:", error);
      ElMessage.error("Không thể tải danh sách chi nhánh");
    }
  };

  // Nạp toàn bộ bàn của chi nhánh; sau khi có dữ liệu thì tính lại layout lưới.
  const fetchTables = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(TABLE_API, {
        params: { branchId: selectedBranchId.value },
        headers: { Authorization: `Bearer ${token}` },
      });
      tables.value = response.data;
      filteredTables.value = response.data; // reset bộ lọc về toàn bộ
      await nextTick();
      // Chờ khung hình kế tiếp để DOM có kích thước thật rồi mới tính pageSize.
      requestAnimationFrame(() => {
        onTablesGridLayoutTick();
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách bàn:", error);
      ElMessage.error("Không thể lấy danh sách bàn");
    }
  };

  // Nạp các con số thống kê (tổng bàn, trống, đang dùng, doanh thu hiện tại...).
  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${TABLE_API}/summary`, {
        params: { branchId: selectedBranchId.value },
        headers: { Authorization: `Bearer ${token}` },
      });
      summary.value = response.data;
    } catch (error) {
      console.error("Lỗi lấy thống kê:", error);
    }
  };

  // Cơ chế phát hiện món "vừa mới xong" để bật thông báo cho phục vụ:
  // lưu lại trạng thái từng order_item ở lần fetch trước, so sánh với lần fetch sau.
  const lastOrderItemStatusById = new Map(); // order_item_id → status (lần trước)
  let orderItemStatusSnapshotPrimed = false; // đã có "ảnh chụp" đầu tiên chưa

  // Xóa snapshot (dùng khi mở lại dialog để không báo nhầm món đã done từ trước).
  function resetOrderItemStatusSnapshot() {
    lastOrderItemStatusById.clear();
    orderItemStatusSnapshotPrimed = false;
  }

  // Ghi lại trạng thái hiện tại của mọi order_item làm mốc so sánh cho lần sau.
  function primeOrderItemStatusSnapshot(orders) {
    lastOrderItemStatusById.clear();
    for (const order of orders || []) {
      for (const oi of order.OrderItems || []) {
        const id = oi.order_item_id;
        if (id == null) continue;
        lastOrderItemStatusById.set(id, String(oi.status || "").toLowerCase());
      }
    }
  }

  // Lấy danh sách số bàn của 1 đơn (ưu tiên bàn ghép OrderTables, fallback Table đơn), sắp xếp tăng dần.
  function tableNumbersFromOrder(order) {
    const linked = (order?.OrderTables || []).map((link) => link.Table).filter(Boolean);
    const tables = linked.length ? linked : order?.Table ? [order.Table] : [];
    return tables
      .map((t) => t.table_number)
      .filter((n) => n != null && n !== "")
      .sort((a, b) => a - b);
  }

  // So sánh dữ liệu mới với snapshot cũ: món nào chuyển sang "done" (trước đó khác done) thì báo.
  function notifyDishJustDoneFromOrders(ordersAfter) {
    for (const order of ordersAfter || []) {
      const tableNumbers = tableNumbersFromOrder(order);
      for (const oi of order.OrderItems || []) {
        const id = oi.order_item_id;
        if (id == null) continue;
        const st = String(oi.status || "").toLowerCase();
        const prev = lastOrderItemStatusById.get(id);
        // Chỉ báo khi có mốc cũ (prev) và trạng thái vừa đổi thành "done".
        if (st === "done" && prev && prev !== "done") {
          notifyKitchenDishDone({
            dishName: oi.MenuItem?.name,
            tableNumbers: tableNumbers.length
              ? tableNumbers
              : selectedTable.value?.table_number != null
                ? [selectedTable.value.table_number]
                : [],
            orderItemId: id,
          });
        }
      }
    }
  }

  // Nạp các đơn của 1 bàn; nếu đã có snapshot thì phát hiện món vừa done để báo, rồi cập nhật snapshot.
  const fetchTableOrders = async (table_id) => {
    if (!table_id) return;
    tableOrdersLoading.value = true;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${WAITER_API}/orders`, {
        params: { table_id },
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = Array.isArray(res.data) ? res.data : res.data.orders || [];
      if (orderItemStatusSnapshotPrimed) {
        notifyDishJustDoneFromOrders(data); // so với lần trước → báo món mới xong
      }
      tableOrders.value = data;
      primeOrderItemStatusSnapshot(data);   // cập nhật mốc cho lần sau
      orderItemStatusSnapshotPrimed = true;
    } catch (err) {
      console.error("Lỗi lấy đơn hàng bàn:", err);
      tableOrders.value = [];
    } finally {
      tableOrdersLoading.value = false;
    }
  };

  // Nạp hóa đơn tổng hợp (bill) của bàn.
  const fetchTableBill = async (table_id) => {
    if (!table_id) return;
    tableBillLoading.value = true;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${WAITER_API}/tables/${table_id}/bill`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      tableBill.value = res.data || null;
    } catch (err) {
      console.error("Lỗi lấy bill bàn:", err);
      tableBill.value = null;
    } finally {
      tableBillLoading.value = false;
    }
  };

  // Nạp trạng thái thanh toán của bàn; nếu vừa chuyển sang "succeeded" (do CK/QR) thì tự đóng dialog + báo.
  const fetchTablePayment = async (table_id) => {
    if (!table_id) return;
    const prevStatus = paymentInfo.value?.status || ""; // nhớ trạng thái cũ để so sánh
    paymentLoading.value = true;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${WAITER_API}/tables/${table_id}/payment`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.payment) {
        paymentInfo.value = {
          ...res.data.payment,
          order_id: res.data?.order_id ?? res.data.payment.order_id,
        };
      } else {
        paymentInfo.value = null;
      }
      if (paymentInfo.value?.method) {
        paymentMethod.value = paymentInfo.value.method; // đồng bộ phương thức đang chọn
      }
      // Chuyển trạng thái sang succeeded khi đang mở dialog → thông báo và đóng dialog.
      const newStatus = paymentInfo.value?.status || "";
      if (
        newStatus === "succeeded" &&
        prevStatus !== "succeeded" &&
        (showDetailDialog.value || showQrDialog.value)
      ) {
        closePaymentDialogs();
        ElMessage.success("Đã xác nhận thanh toán thành công");
      }
    } catch (err) {
      paymentInfo.value = null;
    } finally {
      paymentLoading.value = false;
    }
  };

  // Khi mở dialog chi tiết bàn: reset snapshot rồi nạp đồng thời đơn + bill + trạng thái thanh toán.
  const onDetailDialogOpen = () => {
    resetOrderItemStatusSnapshot();
    fetchBranchWaiters();
    if (selectedTable.value?.table_id) {
      fetchTableOrders(selectedTable.value.table_id);
      fetchTableBill(selectedTable.value.table_id);
      fetchTablePayment(selectedTable.value.table_id);
    }
  };

  const fetchBranchWaiters = async () => {
    branchWaitersLoading.value = true;
    try {
      const res = await axios.get(`${WAITER_API}/branch-waiters`, {
        params: { branchId: selectedBranchId.value },
        headers: authHeaders(),
      });
      branchWaiters.value = res.data?.waiters || [];

      const me = getCurrentUser();
      if (me?.user_id && ["waiter", "admin"].includes(me?.role)) {
        const exists = branchWaiters.value.some((w) => w.user_id === me.user_id);
        if (!exists) {
          branchWaiters.value.unshift({
            user_id: me.user_id,
            full_name: me.full_name || me.username || "Tôi",
            phone: me.phone || null,
          });
        }
      }
      syncSelectedWaiterFromOrders();
    } catch (err) {
      console.error("fetchBranchWaiters:", err);
      const me = getCurrentUser();
      branchWaiters.value =
        me?.user_id && ["waiter", "admin"].includes(me?.role)
          ? [
              {
                user_id: me.user_id,
                full_name: me.full_name || me.username || "Tôi",
                phone: me.phone || null,
              },
            ]
          : [];
      syncSelectedWaiterFromOrders();
    } finally {
      branchWaitersLoading.value = false;
    }
  };

  const syncSelectedWaiterFromOrders = () => {
    const waiter =
      tableOrders.value[0]?.AssignedWaiter ||
      tableOrders.value[0]?.assigned_waiter ||
      currentAssignedWaiter.value;
    selectedWaiterUserId.value =
      waiter?.user_id || getCurrentUser()?.user_id || null;
  };

  const isTableServing = computed(() => {
    const st = normalizeTableStatus(selectedTable.value?.status);
    return st === "occupied" || st === "pre-ordered";
  });

  watch(tableOrders, () => syncSelectedWaiterFromOrders(), { deep: true });

  const canAssignSelf = computed(() => {
    const user = getCurrentUser();
    return Boolean(user?.user_id && ["waiter", "admin"].includes(user?.role));
  });

  const assignSelfAsWaiter = async () => {
    const user = getCurrentUser();
    if (!user?.user_id) return;
    selectedWaiterUserId.value = user.user_id;
    await assignWaiterToSession();
  };

  const assignWaiterToSession = async () => {
    if (!selectedWaiterUserId.value || !selectedTable.value?.table_id) {
      ElMessage.warning("Chọn nhân viên phục vụ trước");
      return;
    }
    assignWaiterLoading.value = true;
    try {
      const orderId = activeSessionOrderId.value;
      const payload = {
        waiter_user_id: selectedWaiterUserId.value,
        branch_id: selectedBranchId.value,
      };
      if (orderId) {
        await axios.patch(
          `${WAITER_API}/orders/${orderId}/assign-waiter`,
          payload,
          { headers: authHeaders() }
        );
      } else {
        await axios.patch(
          `${WAITER_API}/tables/${selectedTable.value.table_id}/assign-waiter`,
          payload,
          { headers: authHeaders() }
        );
      }
      ElMessage.success("Đã gán nhân viên phục vụ");
      if (selectedTable.value?.table_id) {
        await fetchTableOrders(selectedTable.value.table_id);
      }
      await fetchTables();
      syncSelectedWaiterFromOrders();
    } catch (err) {
      ElMessage.error(err.response?.data?.message || "Không thể gán nhân viên");
    } finally {
      assignWaiterLoading.value = false;
    }
  };

  // Mở dialog gọi món tại bàn: nạp thực đơn của chi nhánh, khởi tạo số lượng = 0 cho mọi món.
  const openCreateOrderDialog = async () => {
    menuItemsForOrder.value = [];
    orderQuantities.value = {};
    menuItemsLoading.value = true;
    showCreateOrderDialog.value = true;
    try {
      const res = await axios.get(`${API_ORIGIN}/api/menu-items`, {
        params: { page: 1, limit: 500, branch_id: selectedBranchId.value },
      });
      const items = res.data?.items || res.data || [];
      menuItemsForOrder.value = items;
      items.forEach((item) => {
        orderQuantities.value[item.item_id] = 0;
      });
    } catch (err) {
      console.error("Lỗi lấy thực đơn:", err);
      ElMessage.error("Không thể tải thực đơn");
    } finally {
      menuItemsLoading.value = false;
    }
  };

  // Gửi đơn gọi món: gom các món có số lượng > 0 → POST; xong thì làm mới đơn/bàn/thống kê.
  const submitCreateOrder = async () => {
    if (!selectedTable.value?.table_id) return;
    const items = Object.entries(orderQuantities.value)
      .filter(([, qty]) => qty > 0)
      .map(([item_id, quantity]) => ({ item_id: Number(item_id), quantity }));
    if (!items.length) {
      ElMessage.warning("Chọn ít nhất một món");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${WAITER_API}/orders`,
        { table_id: selectedTable.value.table_id, items },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      ElMessage.success("Tạo đơn thành công");
      showCreateOrderDialog.value = false;
      fetchTableOrders(selectedTable.value.table_id);
      fetchTables();
      fetchSummary();
    } catch (err) {
      ElMessage.error(err.response?.data?.message || "Tạo đơn thất bại");
    }
  };

  // Đánh dấu 1 món "đã phục vụ" (served); xong thì làm mới danh sách đơn của bàn.
  const markItemServed = async (orderItemId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${WAITER_API}/order-items/${orderItemId}/served`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      ElMessage.success("Đã đánh dấu đã phục vụ");
      if (selectedTable.value?.table_id) {
        fetchTableOrders(selectedTable.value.table_id);
      }
    } catch (err) {
      ElMessage.error(err.response?.data?.message || "Cập nhật thất bại");
    }
  };

  // Thêm bàn mới cho chi nhánh; xong thì reset form và làm mới danh sách + thống kê.
  const addTable = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(TABLE_API, { ...newTable.value, branch_id: selectedBranchId.value }, {
        params: { branchId: selectedBranchId.value },
        headers: { Authorization: `Bearer ${token}` },
      });
      ElMessage.success("Thêm bàn thành công");
      showAddDialog.value = false;
      newTable.value = { table_number: null, capacity: TABLE_CAPACITY };
      fetchTables();
      fetchSummary();
    } catch (error) {
      ElMessage.error(error.response?.data?.message || "Lỗi thêm bàn");
    }
  };

  // Mở dialog sửa bàn: đổ dữ liệu bàn đang chọn vào form (chuẩn hóa trạng thái).
  const showEditDialog = () => {
    if (!selectedTable.value) return;

    editTableForm.value = {
      table_number: selectedTable.value.table_number,
      capacity: selectedTable.value.capacity,
      status: normalizeTableStatus(selectedTable.value.status) || selectedTable.value.status,
    };

    showEditDialogVisible.value = true;
  };

  // Cập nhật bàn: waiter chỉ được đổi TRẠNG THÁI (PATCH); còn lại được sửa đầy đủ số bàn/sức chứa (PUT).
  const updateTable = async () => {
    try {
      const token = localStorage.getItem("token");
      const role = userRole.value;

      if (role === "waiter") {
        // Phục vụ: chỉ đổi trạng thái bàn (vd trống ↔ đang dọn).
        await axios.patch(
          `${WAITER_API}/tables/${selectedTable.value.table_id}/status`,
          { status: editTableForm.value.status },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Admin/manager: sửa đầy đủ; dùng số bàn CŨ trên URL để định danh.
        const oldTableNumber = selectedTable.value.table_number;
        await axios.put(
          `${TABLE_API}/${oldTableNumber}`,
          { ...editTableForm.value, branch_id: selectedBranchId.value },
          {
            params: { branchId: selectedBranchId.value },
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      ElMessage.success("Cập nhật bàn thành công");
      showEditDialogVisible.value = false;
      showDetailDialog.value = false;
      fetchTables();
      fetchSummary();
    } catch (error) {
      ElMessage.error(error.response?.data?.message || "Lỗi cập nhật bàn");
    }
  };

  // Xóa bàn: hỏi xác nhận trước; nếu người dùng bấm Hủy (error === "cancel") thì im lặng bỏ qua.
  const deleteTable = async (table) => {
    try {
      await ElMessageBox.confirm(
        `Bạn có chắc muốn xóa bàn ${table.table_number}?`,
        "Xác nhận xóa",
        {
          confirmButtonText: "Xóa",
          cancelButtonText: "Hủy",
          type: "warning",
        }
      );

      const token = localStorage.getItem("token");
      await axios.delete(`${TABLE_API}/${table.table_number}`, {
        params: { branchId: selectedBranchId.value },
        headers: { Authorization: `Bearer ${token}` },
      });

      ElMessage.success("Xóa bàn thành công");
      showDetailDialog.value = false;
      fetchTables();
      fetchSummary();
    } catch (error) {
      if (error !== "cancel") {
        ElMessage.error(error.response?.data?.message || "Lỗi xóa bàn");
      }
    }
  };

  // Chọn bàn và mở dialog chi tiết.
  const viewTableDetail = (table) => {
    selectedTable.value = table;
    showDetailDialog.value = true;
  };

  // Mở dialog QR ở chế độ "link": tạo ảnh QR trỏ tới trang gọi món của bàn (/t/{token}).
  const openQrDialog = async (table) => {
    qrSelectedTable.value = table;
    linkQrDataUrl.value = "";
    qrMode.value = "link";
    resetVietQrPayment();
    stopQrPaymentPolling();
    qrLink.value = buildTableQrLink(table?.qr_token);
    showQrDialog.value = true;
    if (!qrLink.value) return; // bàn chưa có token thì thôi
    try {
      linkQrDataUrl.value = await createQrDataUrl(qrLink.value);
    } catch (e) {
      console.error("QR gen error:", e);
      ElMessage.error("Không thể tạo QR");
    }
  };

  // Đóng tất cả dialog liên quan thanh toán và dừng poll QR (dùng khi thanh toán xong/hủy).
  const closePaymentDialogs = () => {
    stopQrPaymentPolling();
    showQrDialog.value = false;
    showDetailDialog.value = false;
    showEditDialogVisible.value = false;
  };

  // Callback khi VietQR/SePay xác nhận đã thanh toán: đóng dialog + làm mới toàn bộ dữ liệu bàn.
  const onQrPaymentSucceeded = async () => {
    closePaymentDialogs();
    ElMessage.success("SEPay đã xác nhận thanh toán");
    if (selectedTable.value?.table_id) {
      fetchTablePayment(selectedTable.value.table_id);
      fetchTableBill(selectedTable.value.table_id);
      fetchTableOrders(selectedTable.value.table_id);
    }
    fetchTables();
    fetchSummary();
  };

  // Đóng dialog QR bằng bất kỳ cách nào → dừng poll để tránh gọi API vô ích.
  watch(showQrDialog, (visible) => {
    if (!visible) stopQrPaymentPolling();
  });

  // Mở dialog QR ở chế độ "payment": gọi API tạo VietQR và tự poll trạng thái.
  const openPaymentQrDialog = async (table) => {
    qrSelectedTable.value = table;
    linkQrDataUrl.value = "";
    qrLink.value = "";
    qrMode.value = "payment";
    resetVietQrPayment();
    stopQrPaymentPolling();
    showQrDialog.value = true;
    try {
      await createPaymentQr(table.qr_token, { onSucceeded: onQrPaymentSucceeded });
    } catch (e) {
      console.error("Payment QR error:", e);
      ElMessage.error(e.response?.data?.error || "Không thể tạo QR thanh toán");
    }
  };

  // Copy link bàn vào clipboard.
  const copyQrLink = async () => {
    try {
      if (!qrLink.value) return;
      await navigator.clipboard.writeText(qrLink.value);
      ElMessage.success("Đã copy link");
    } catch {
      ElMessage.error("Copy thất bại");
    }
  };

  // Lọc bàn theo ô tìm (số bàn) và trạng thái; sau khi lọc luôn về trang 1.
  const filterTables = () => {
    let result = tables.value;

    if (searchQuery.value) {
      result = result.filter((t) => t.table_number.toString().includes(searchQuery.value));
    }

    if (filterStatus.value) {
      result = result.filter(
        (t) => normalizeTableStatus(t.status) === filterStatus.value
      );
    }

    filteredTables.value = result;
    tableCurrentPage.value = 1;
  };

  // Tổng số trang của lưới bàn (theo danh sách đã lọc và pageSize).
  const tablePaginationTotalPages = computed(() =>
    Math.max(1, Math.ceil((filteredTables.value?.length || 0) / tablePageSize.value))
  );
  // Cắt lấy đúng phần bàn của trang hiện tại (phân trang phía client).
  const displayedTables = computed(() => {
    const list = filteredTables.value || [];
    const size = tablePageSize.value;
    const start = (tableCurrentPage.value - 1) * size;
    return list.slice(start, start + size);
  });

  // Các alias tiện dùng ở template để lấy class/màu tag/nhãn theo trạng thái bàn.
  const getStatusClass = getTableStatusClass;
  const getTagType = getTableTagType;
  const getStatusText = getTableStatusLabel;

  // Chốt thanh toán tiền mặt/CK tại quầy (checkout); xong thì làm mới bill/đơn/bàn.
  const finalizePayment = async () => {
    if (!selectedTable.value?.table_id) return;
    paymentSubmitting.value = true; // khóa nút tránh double-submit
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${WAITER_API}/tables/${selectedTable.value.table_id}/checkout`,
        { method: paymentMethod.value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      paymentInfo.value = res.data?.payment || null;
      ElMessage.success("Đã xác nhận thanh toán");
      closePaymentDialogs();
      if (selectedTable.value?.table_id) {
        fetchTableBill(selectedTable.value.table_id);
        fetchTableOrders(selectedTable.value.table_id);
      }
      fetchTables();
      fetchSummary();
    } catch (err) {
      ElMessage.error(err.response?.data?.message || "Không thể xác nhận thanh toán");
    } finally {
      paymentSubmitting.value = false;
    }
  };

  // Tải hóa đơn PDF: nhận blob rồi tạo link ẩn để trình duyệt tải xuống, sau đó thu hồi URL tạm.
  const downloadInvoice = async () => {
    if (!paymentInfo.value?.order_id) {
      ElMessage.warning("Chưa có hóa đơn để tải");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${WAITER_API}/reservations/${paymentInfo.value.order_id}/invoice.pdf`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" } // nhận nhị phân
      );
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const invoiceNo = paymentInfo.value.invoice_no || "invoice";
      link.download = `${invoiceNo}.pdf`;
      document.body.appendChild(link);
      link.click();   // kích hoạt tải
      link.remove();
      window.URL.revokeObjectURL(url); // giải phóng bộ nhớ blob URL
    } catch (err) {
      ElMessage.error(err.response?.data?.message || "Không thể tải hóa đơn");
    }
  };

  const openReceptionDialog = () => {
    showReceptionDialog.value = true;
  };

  // Khi mở dialog tiếp nhận: reset về tab "đặt trước", xóa dữ liệu cũ, và nạp danh sách khách sắp tới.
  const onReceptionDialogOpen = () => {
    receptionTab.value = "reservation";
    receptionSearchQuery.value = "";
    receptionResults.value = [];
    receptionSearched.value = false;
    walkInGuests.value = 2;
    walkInSelectedTableIds.value = [];
    walkInTables.value = [];
    loadUpcomingArrivals();
  };

  // Chuyển sang tab "khách vãng lai" → nạp bàn trống gợi ý.
  const onReceptionTabChange = (tabName) => {
    if (tabName === "walkin") fetchWalkInTables();
  };

  // Nạp danh sách đơn đặt bàn sắp đến giờ (để lễ tân chủ động check-in).
  const loadUpcomingArrivals = async () => {
    receptionSearchLoading.value = true;
    try {
      const res = await axios.get(`${RECEPTION_API}/upcoming`, {
        params: { branchId: selectedBranchId.value },
        headers: authHeaders(),
      });
      receptionResults.value = res.data?.results || [];
    } catch (err) {
      console.error("loadUpcomingArrivals:", err);
      receptionResults.value = [];
      ElMessage.error(
        err.response?.data?.message ||
          "Không tải được danh sách đặt bàn. Kiểm tra backend đã chạy và đã restart sau khi cập nhật API."
      );
    } finally {
      receptionSearchLoading.value = false;
    }
  };

  // Định dạng giờ đến hiển thị trong danh sách tiếp nhận (dd/MM HH:mm).
  const formatReceptionTime = (datetime) => {
    if (!datetime) return "";
    return new Date(datetime).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Gộp danh sách bàn của 1 đơn thành chuỗi "B1, B2..." (ưu tiên bàn ghép, fallback bàn đơn).
  const formatReceptionTables = (item) => {
    const tableList = item?.tables?.length ? item.tables : item?.table ? [item.table] : [];
    if (!tableList.length) return "—";
    return tableList
      .map((t) => `B${t.table_number ?? "?"}`)
      .join(", ");
  };

  // Đơn đã check-in chưa? (có mốc thời gian checked_in_at).
  const isReceptionCheckedIn = (item) => Boolean(item?.checked_in_at);

  // Có được phép check-in đơn này không: chưa check-in, chưa hoàn tất/hủy, và đã có bàn gán.
  const canConfirmReception = (item) => {
    if (isReceptionCheckedIn(item)) return false;
    const status = String(item?.status || "").toLowerCase();
    if (status === "completed" || status === "cancelled") return false;
    const tableList = item?.tables?.length ? item.tables : item?.table ? [item.table] : [];
    return tableList.length > 0 || Boolean(item?.table_id);
  };

  // Đơn có đặt món trước hay không (để hiển thị nhãn) — chưa check-in và có dấu hiệu pre-order.
  const hasReceptionPreOrder = (item) =>
    !isReceptionCheckedIn(item) &&
    (Boolean(item?.hasPreOrder) ||
      String(item?.status || "").toLowerCase() === "pre-ordered" ||
      (Array.isArray(item?.OrderItems) && item.OrderItems.length > 0));

  // Tìm đơn đặt bàn theo SĐT/tên/mã.
  const searchReception = async () => {
    const q = receptionSearchQuery.value.trim();
    if (!q) {
      ElMessage.warning("Nhập SĐT, tên hoặc mã đặt bàn");
      return;
    }
    receptionSearchLoading.value = true;
    receptionSearched.value = true; // đánh dấu đã tìm để hiện "không có kết quả" nếu rỗng
    try {
      const res = await axios.get(`${RECEPTION_API}/search`, {
        params: { q, branchId: selectedBranchId.value },
        headers: authHeaders(),
      });
      receptionResults.value = res.data?.results || [];
    } catch (err) {
      console.error("searchReception:", err);
      receptionResults.value = [];
      ElMessage.error(err.response?.data?.message || "Không thể tìm đặt bàn");
    } finally {
      receptionSearchLoading.value = false;
    }
  };

  // Check-in 1 đơn đặt bàn: gọi API, làm mới dữ liệu + danh sách, rồi mở luôn chi tiết bàn tương ứng.
  const confirmReception = async (item) => {
    receptionConfirmLoading.value = item.order_id; // để nút của đúng dòng đó loading
    try {
      const res = await axios.post(
        `${RECEPTION_API}/check-in`,
        { order_id: item.order_id, branch_id: selectedBranchId.value },
        { headers: authHeaders() }
      );
      ElMessage.success(res.data?.message || "Tiếp nhận thành công");
      await fetchTables();
      await fetchSummary();
      // Làm mới danh sách theo ngữ cảnh: đang tìm thì tìm lại, không thì nạp lại "sắp tới".
      if (receptionSearchQuery.value.trim()) {
        await searchReception();
      } else {
        await loadUpcomingArrivals();
      }
      // Mở chi tiết bàn vừa được gán (nếu tìm thấy trong danh sách hiện tại).
      const tableNum = res.data?.table?.table_number ?? item.table?.table_number;
      if (tableNum != null) {
        const found = tables.value.find((t) => t.table_number === tableNum);
        if (found) viewTableDetail(found);
      }
    } catch (err) {
      ElMessage.error(err.response?.data?.message || "Tiếp nhận thất bại");
    } finally {
      receptionConfirmLoading.value = null;
    }
  };

  // Nạp danh sách bàn trống phù hợp cho số khách vãng lai hiện tại; reset các bàn đã chọn.
  const fetchWalkInTables = async () => {
    walkInTablesLoading.value = true;
    walkInSelectedTableIds.value = [];
    try {
      const res = await axios.get(`${RECEPTION_API}/walk-in-tables`, {
        params: { branchId: selectedBranchId.value, guests: walkInGuests.value },
        headers: authHeaders(),
      });
      walkInTables.value = res.data?.tables || [];
    } catch (err) {
      console.error("fetchWalkInTables:", err);
      walkInTables.value = [];
      // Chỉ báo lỗi khi người dùng đang thực sự ở tab walk-in.
      if (receptionTab.value === "walkin") {
        ElMessage.error(err.response?.data?.message || "Không thể tải bàn trống");
      }
    } finally {
      walkInTablesLoading.value = false;
    }
  };

  const isWalkInTableSelected = (tableId) => walkInSelectedTableIds.value.includes(tableId);

  // Bật/tắt chọn 1 bàn cho walk-in (dùng để ghép nhiều bàn cho nhóm đông).
  const toggleWalkInTable = (tableId) => {
    if (isWalkInTableSelected(tableId)) {
      walkInSelectedTableIds.value = walkInSelectedTableIds.value.filter((id) => id !== tableId);
      return;
    }
    walkInSelectedTableIds.value = [...walkInSelectedTableIds.value, tableId];
  };

  // Xếp bàn cho khách vãng lai: gửi các bàn đã chọn + số khách; xong thì mở chi tiết bàn chính.
  const submitWalkIn = async () => {
    if (!hasEnoughWalkInCapacity.value) {
      ElMessage.warning("Chọn thêm bàn để đủ chỗ cho nhóm khách");
      return;
    }
    walkInSubmitLoading.value = true;
    try {
      const res = await axios.post(
        `${RECEPTION_API}/walk-in`,
        {
          table_id: walkInSelectedTableIds.value[0], // bàn "chính" (tương thích API cũ)
          table_ids: walkInSelectedTableIds.value,   // toàn bộ bàn ghép
          number_of_guests: walkInGuests.value,
          branch_id: selectedBranchId.value,
        },
        { headers: authHeaders() }
      );
      ElMessage.success(res.data?.message || "Xếp bàn thành công");
      showReceptionDialog.value = false;
      await fetchTables();
      await fetchSummary();
      const tableNum = res.data?.table?.table_number;
      if (tableNum != null) {
        const found = tables.value.find((t) => t.table_number === tableNum);
        if (found) viewTableDetail(found);
      }
    } catch (err) {
      ElMessage.error(err.response?.data?.message || "Xếp bàn thất bại");
    } finally {
      walkInSubmitLoading.value = false;
    }
  };

  // Đóng dialog tiếp nhận và mở chi tiết của 1 bàn cụ thể (dùng khi click vào bàn trong kết quả).
  const openTableAfterReception = (tableInfo) => {
    if (!tableInfo?.table_number) return;
    const found = tables.value.find((t) => t.table_number === tableInfo.table_number);
    if (found) {
      showReceptionDialog.value = false;
      viewTableDetail(found);
    }
  };

  // Đổi chi nhánh: xóa bộ lọc/lựa chọn hiện tại rồi nạp lại bàn + thống kê của chi nhánh mới.
  const handleBranchChange = () => {
    tableCurrentPage.value = 1;
    filterStatus.value = "";
    searchQuery.value = "";
    selectedTable.value = null;
    showDetailDialog.value = false;
    fetchTables();
    fetchSummary();
  };

  // --- Đồng bộ realtime: kết hợp poll định kỳ + WebSocket theo chi nhánh ---
  let refreshTimer = null;      // id của setInterval poll
  let disposeTablesWs = null;   // hàm huỷ kết nối WebSocket

  // Waiter/kitchen cần cập nhật nhanh (4s); vai trò khác chỉ cần chậm hơn (12s) để đỡ tải.
  function getTablesPollIntervalMs() {
    const r = userRole.value;
    if (r === "waiter" || r === "kitchen") return 4000;
    return 12000;
  }

  // Một nhịp đồng bộ: nếu đang mở chi tiết bàn thì làm mới đơn/bill/thanh toán; nếu không thì làm mới lưới + thống kê.
  function pollTablesSyncTick() {
    if (showDetailDialog.value && selectedTable.value?.table_id) {
      fetchTableOrders(selectedTable.value.table_id);
      fetchTableBill(selectedTable.value.table_id);
      fetchTablePayment(selectedTable.value.table_id);
    } else {
      fetchTables();
      fetchSummary();
    }
  }

  // Nhận message realtime: chỉ quan tâm sự kiện món/luồng đơn → báo bếp + đồng bộ ngay lập tức.
  function onTablesRealtimeMsg(msg) {
    if (msg?.type !== "order_item_status" && msg?.type !== "order_flow") return;
    handleKitchenRealtimeMessage(msg);
    pollTablesSyncTick();
  }

  // Dừng poll + ngắt WebSocket (gọi trước khi khởi động lại hoặc khi unmount).
  function stopTablesPollingAndWs() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    if (typeof disposeTablesWs === "function") {
      disposeTablesWs();
      disposeTablesWs = null;
    }
  }

  // Khởi động poll (theo nhịp phù hợp vai trò) + mở WebSocket của chi nhánh đang chọn.
  function startTablesPollingAndWs() {
    stopTablesPollingAndWs();
    refreshTimer = setInterval(pollTablesSyncTick, getTablesPollIntervalMs());
    disposeTablesWs = connectBranchRealtime(API_ORIGIN, selectedBranchId.value, onTablesRealtimeMsg);
  }

  // Đổi chi nhánh → khởi động lại poll + WebSocket để lắng nghe đúng chi nhánh mới.
  watch(selectedBranchId, () => {
    startTablesPollingAndWs();
  });

  // pageSize đổi → đảm bảo trang hiện tại vẫn hợp lệ.
  watch(tablePageSize, () => {
    clampTablePage();
  });

  // Khi gắn component: xác định vai trò/chi nhánh, nạp dữ liệu, bật realtime và theo dõi resize lưới.
  onMounted(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    userRole.value = user?.role || "";
    // Không phải admin tổng → khóa vào chi nhánh của tài khoản.
    if (user?.role !== "admin" && user?.branch_id) {
      selectedBranchId.value = Number(user.branch_id) || 1;
    }
    fetchBranches().then(() => {
      fetchTables();
      fetchSummary();
      startTablesPollingAndWs();
    });

    // Sau khi DOM sẵn sàng: gắn ResizeObserver + listener resize để tự tính lại pageSize.
    nextTick(() => {
      const el = tablesGridRef.value;
      if (el && typeof ResizeObserver !== "undefined") {
        tablesGridResizeObserver = new ResizeObserver(() => {
          onTablesGridLayoutTick();
        });
        tablesGridResizeObserver.observe(el);
      }
      window.addEventListener("resize", onTablesGridLayoutTick);
      requestAnimationFrame(() => onTablesGridLayoutTick());
    });
  });

  // Dọn dẹp toàn bộ timer/observer/listener khi rời trang → tránh rò rỉ bộ nhớ và gọi API thừa.
  onUnmounted(() => {
    stopQrPaymentPolling();
    stopTablesPollingAndWs();
    tablesGridResizeObserver?.disconnect();
    tablesGridResizeObserver = null;
    window.removeEventListener("resize", onTablesGridLayoutTick);
  });

  return {
    TABLE_CAPACITY,
    MAX_GUESTS,
    tablesGridRef,
    userRole,
    branches,
    selectedBranchId,
    summary,
    searchQuery,
    filterStatus,
    tableCurrentPage,
    showAddDialog,
    showDetailDialog,
    showEditDialogVisible,
    selectedTable,
    showQrDialog,
    qrSelectedTable,
    qrDataUrl,
    qrLink,
    qrMode,
    qrPaymentAmount,
    qrPaymentCode,
    qrPaymentStatus,
    tableOrders,
    tableOrdersLoading,
    showCreateOrderDialog,
    menuItemsForOrder,
    menuItemsLoading,
    orderQuantities,
    tableBill,
    tableBillLoading,
    paymentInfo,
    paymentMethod,
    paymentSubmitting,
    paymentMethodOptions,
    hasOrderItemsSelected,
    preOrders,
    newTable,
    editTableForm,
    showReceptionDialog,
    receptionTab,
    receptionSearchQuery,
    receptionResults,
    receptionSearchLoading,
    receptionSearched,
    receptionConfirmLoading,
    walkInGuests,
    walkInTables,
    walkInTablesLoading,
    walkInSelectedTableIds,
    walkInSubmitLoading,
    walkInSelectedCapacity,
    hasEnoughWalkInCapacity,
    tablePaginationTotalPages,
    displayedTables,
    normalizeTableStatus,
    normalizeOrderStatus,
    isLegacyPreorderOrderStatus,
    getOrderStatusLabel,
    getStatusClass,
    getTagType,
    getStatusText,
    formatCurrency,
    formatTime,
    formatDateTime,
    fetchTables,
    fetchSummary,
    handleBranchChange,
    filterTables,
    viewTableDetail,
    addTable,
    showEditDialog,
    updateTable,
    deleteTable,
    onDetailDialogOpen,
    openCreateOrderDialog,
    submitCreateOrder,
    markItemServed,
    openQrDialog,
    openPaymentQrDialog,
    copyQrLink,
    finalizePayment,
    downloadInvoice,
    openReceptionDialog,
    onReceptionDialogOpen,
    onReceptionTabChange,
    formatReceptionTime,
    formatReceptionTables,
    isReceptionCheckedIn,
    canConfirmReception,
    hasReceptionPreOrder,
    searchReception,
    confirmReception,
    fetchWalkInTables,
    isWalkInTableSelected,
    toggleWalkInTable,
    submitWalkIn,
    openTableAfterReception,
    branchWaiters,
    branchWaitersLoading,
    selectedWaiterUserId,
    assignWaiterLoading,
    activeSessionOrderId,
    currentAssignedWaiter,
    assignWaiterToSession,
    isTableServing,
    canAssignSelf,
    assignSelfAsWaiter,
  };
}
