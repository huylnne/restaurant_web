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
  const tablesGridRef = ref(null);
  const tablePageSize = ref(36);
  let tablesGridResizeObserver = null;

  function readCssPxVar(name, fallback) {
    if (typeof document === "undefined") return fallback;
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  function computeTablePageSize() {
    const el = tablesGridRef.value;
    if (!el || typeof window === "undefined") return;
    const w = el.clientWidth;
    if (w < 80) return;

    const minCard = readCssPxVar("--hl-admin-grid-min", 220);
    const gap = readCssPxVar("--hl-admin-grid-gap", 16);
    const cols = Math.max(1, Math.floor((w + gap) / (minCard + gap)));

    const rect = el.getBoundingClientRect();
    const reserveBottom = 120;
    const availH = Math.max(240, window.innerHeight - rect.top - reserveBottom);
    const estRowH = 150;
    const rows = Math.max(3, Math.min(14, Math.floor(availH / estRowH)));

    const next = Math.min(150, Math.max(12, cols * rows));
    if (tablePageSize.value !== next) {
      tablePageSize.value = next;
    }
  }

  function clampTablePage() {
    const total = filteredTables.value?.length || 0;
    const maxPage = Math.max(1, Math.ceil(total / tablePageSize.value));
    if (tableCurrentPage.value > maxPage) {
      tableCurrentPage.value = maxPage;
    }
  }

  function onTablesGridLayoutTick() {
    computeTablePageSize();
    clampTablePage();
  }

  const userRole = ref("");
  const branches = ref([]);
  const selectedBranchId = ref(1);
  const tables = ref([]);
  const filteredTables = ref([]);
  const summary = ref({
    totalTables: 0,
    availableTables: 0,
    occupiedTables: 0,
    reservedTables: 0,
    cleaningTables: 0,
    currentRevenue: 0,
  });

  const searchQuery = ref("");
  const filterStatus = ref("");
  const tableCurrentPage = ref(1);
  const showAddDialog = ref(false);
  const showDetailDialog = ref(false);
  const showEditDialogVisible = ref(false);
  const selectedTable = ref(null);

  const showQrDialog = ref(false);
  const qrSelectedTable = ref(null);
  const linkQrDataUrl = ref("");
  const qrLink = ref("");
  const qrMode = ref("link");
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
  const qrDataUrl = computed(() =>
    qrMode.value === "payment" ? paymentQrDataUrl.value : linkQrDataUrl.value
  );

  const tableOrders = ref([]);
  const tableOrdersLoading = ref(false);
  const showCreateOrderDialog = ref(false);
  const menuItemsForOrder = ref([]);
  const menuItemsLoading = ref(false);
  const orderQuantities = ref({});

  const tableBill = ref(null);
  const tableBillLoading = ref(false);
  const paymentInfo = ref(null);
  const paymentLoading = ref(false);
  const paymentMethod = ref("CASH");
  const paymentSubmitting = ref(false);

  const paymentMethodOptions = [
    { value: "CASH", label: "Tiền mặt" },
    { value: "BANK_TRANSFER", label: "Chuyển khoản" },
    { value: "SEPAY", label: "SEPay" },
    { value: "CARD", label: "Thẻ" },
    { value: "WALLET", label: "Ví điện tử" },
  ];

  const hasOrderItemsSelected = computed(() =>
    Object.values(orderQuantities.value).some((qty) => qty > 0)
  );

  const legacyPreOrders = computed(() =>
    tableOrders.value.filter((o) => isLegacyPreorderOrderStatus(o.status))
  );
  const preOrders = legacyPreOrders;

  const newTable = ref({
    table_number: null,
    capacity: TABLE_CAPACITY,
  });

  const editTableForm = ref({
    table_number: null,
    capacity: null,
    status: "",
  });

  const showReceptionDialog = ref(false);
  const receptionTab = ref("reservation");
  const receptionSearchQuery = ref("");
  const receptionResults = ref([]);
  const receptionSearchLoading = ref(false);
  const receptionSearched = ref(false);
  const receptionConfirmLoading = ref(null);
  const walkInGuests = ref(2);
  const walkInTables = ref([]);
  const walkInTablesLoading = ref(false);
  const walkInSelectedTableIds = ref([]);
  const walkInSubmitLoading = ref(false);

  const walkInSelectedCapacity = computed(() =>
    walkInTables.value
      .filter((table) => walkInSelectedTableIds.value.includes(table.table_id))
      .reduce((sum, table) => sum + Number(table.capacity || 0), 0)
  );

  const hasEnoughWalkInCapacity = computed(
    () =>
      walkInSelectedTableIds.value.length > 0 &&
      walkInSelectedCapacity.value >= Number(walkInGuests.value || 0)
  );

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

  const fetchTables = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(TABLE_API, {
        params: { branchId: selectedBranchId.value },
        headers: { Authorization: `Bearer ${token}` },
      });
      tables.value = response.data;
      filteredTables.value = response.data;
      await nextTick();
      requestAnimationFrame(() => {
        onTablesGridLayoutTick();
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách bàn:", error);
      ElMessage.error("Không thể lấy danh sách bàn");
    }
  };

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

  const lastOrderItemStatusById = new Map();
  let orderItemStatusSnapshotPrimed = false;

  function resetOrderItemStatusSnapshot() {
    lastOrderItemStatusById.clear();
    orderItemStatusSnapshotPrimed = false;
  }

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

  function tableNumbersFromOrder(order) {
    const linked = (order?.OrderTables || []).map((link) => link.Table).filter(Boolean);
    const tables = linked.length ? linked : order?.Table ? [order.Table] : [];
    return tables
      .map((t) => t.table_number)
      .filter((n) => n != null && n !== "")
      .sort((a, b) => a - b);
  }

  function notifyDishJustDoneFromOrders(ordersAfter) {
    for (const order of ordersAfter || []) {
      const tableNumbers = tableNumbersFromOrder(order);
      for (const oi of order.OrderItems || []) {
        const id = oi.order_item_id;
        if (id == null) continue;
        const st = String(oi.status || "").toLowerCase();
        const prev = lastOrderItemStatusById.get(id);
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
        notifyDishJustDoneFromOrders(data);
      }
      tableOrders.value = data;
      primeOrderItemStatusSnapshot(data);
      orderItemStatusSnapshotPrimed = true;
    } catch (err) {
      console.error("Lỗi lấy đơn hàng bàn:", err);
      tableOrders.value = [];
    } finally {
      tableOrdersLoading.value = false;
    }
  };

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

  const fetchTablePayment = async (table_id) => {
    if (!table_id) return;
    const prevStatus = paymentInfo.value?.status || "";
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
        paymentMethod.value = paymentInfo.value.method;
      }
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

  const onDetailDialogOpen = () => {
    resetOrderItemStatusSnapshot();
    if (selectedTable.value?.table_id) {
      fetchTableOrders(selectedTable.value.table_id);
      fetchTableBill(selectedTable.value.table_id);
      fetchTablePayment(selectedTable.value.table_id);
    }
  };

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

  const showEditDialog = () => {
    if (!selectedTable.value) return;

    editTableForm.value = {
      table_number: selectedTable.value.table_number,
      capacity: selectedTable.value.capacity,
      status: normalizeTableStatus(selectedTable.value.status) || selectedTable.value.status,
    };

    showEditDialogVisible.value = true;
  };

  const updateTable = async () => {
    try {
      const token = localStorage.getItem("token");
      const role = userRole.value;

      if (role === "waiter") {
        await axios.patch(
          `${WAITER_API}/tables/${selectedTable.value.table_id}/status`,
          { status: editTableForm.value.status },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
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

  const viewTableDetail = (table) => {
    selectedTable.value = table;
    showDetailDialog.value = true;
  };

  const openQrDialog = async (table) => {
    qrSelectedTable.value = table;
    linkQrDataUrl.value = "";
    qrMode.value = "link";
    resetVietQrPayment();
    stopQrPaymentPolling();
    qrLink.value = buildTableQrLink(table?.qr_token);
    showQrDialog.value = true;
    if (!qrLink.value) return;
    try {
      linkQrDataUrl.value = await createQrDataUrl(qrLink.value);
    } catch (e) {
      console.error("QR gen error:", e);
      ElMessage.error("Không thể tạo QR");
    }
  };

  const closePaymentDialogs = () => {
    stopQrPaymentPolling();
    showQrDialog.value = false;
    showDetailDialog.value = false;
    showEditDialogVisible.value = false;
  };

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

  watch(showQrDialog, (visible) => {
    if (!visible) stopQrPaymentPolling();
  });

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

  const copyQrLink = async () => {
    try {
      if (!qrLink.value) return;
      await navigator.clipboard.writeText(qrLink.value);
      ElMessage.success("Đã copy link");
    } catch {
      ElMessage.error("Copy thất bại");
    }
  };

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

  const tablePaginationTotalPages = computed(() =>
    Math.max(1, Math.ceil((filteredTables.value?.length || 0) / tablePageSize.value))
  );
  const displayedTables = computed(() => {
    const list = filteredTables.value || [];
    const size = tablePageSize.value;
    const start = (tableCurrentPage.value - 1) * size;
    return list.slice(start, start + size);
  });

  const getStatusClass = getTableStatusClass;
  const getTagType = getTableTagType;
  const getStatusText = getTableStatusLabel;

  const finalizePayment = async () => {
    if (!selectedTable.value?.table_id) return;
    paymentSubmitting.value = true;
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

  const downloadInvoice = async () => {
    if (!paymentInfo.value?.order_id) {
      ElMessage.warning("Chưa có hóa đơn để tải");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${WAITER_API}/reservations/${paymentInfo.value.order_id}/invoice.pdf`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" }
      );
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const invoiceNo = paymentInfo.value.invoice_no || "invoice";
      link.download = `${invoiceNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      ElMessage.error(err.response?.data?.message || "Không thể tải hóa đơn");
    }
  };

  const openReceptionDialog = () => {
    showReceptionDialog.value = true;
  };

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

  const onReceptionTabChange = (tabName) => {
    if (tabName === "walkin") fetchWalkInTables();
  };

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

  const formatReceptionTime = (datetime) => {
    if (!datetime) return "";
    return new Date(datetime).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatReceptionTables = (item) => {
    const tableList = item?.tables?.length ? item.tables : item?.table ? [item.table] : [];
    if (!tableList.length) return "—";
    return tableList
      .map((t) => `B${t.table_number ?? "?"}`)
      .join(", ");
  };

  const isReceptionCheckedIn = (item) => Boolean(item?.checked_in_at);

  const canConfirmReception = (item) => {
    if (isReceptionCheckedIn(item)) return false;
    const status = String(item?.status || "").toLowerCase();
    if (status === "completed" || status === "cancelled") return false;
    const tableList = item?.tables?.length ? item.tables : item?.table ? [item.table] : [];
    return tableList.length > 0 || Boolean(item?.table_id);
  };

  const hasReceptionPreOrder = (item) =>
    !isReceptionCheckedIn(item) &&
    (Boolean(item?.hasPreOrder) ||
      String(item?.status || "").toLowerCase() === "pre-ordered" ||
      (Array.isArray(item?.OrderItems) && item.OrderItems.length > 0));

  const searchReception = async () => {
    const q = receptionSearchQuery.value.trim();
    if (!q) {
      ElMessage.warning("Nhập SĐT, tên hoặc mã đặt bàn");
      return;
    }
    receptionSearchLoading.value = true;
    receptionSearched.value = true;
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

  const confirmReception = async (item) => {
    receptionConfirmLoading.value = item.order_id;
    try {
      const res = await axios.post(
        `${RECEPTION_API}/check-in`,
        { order_id: item.order_id, branch_id: selectedBranchId.value },
        { headers: authHeaders() }
      );
      ElMessage.success(res.data?.message || "Tiếp nhận thành công");
      await fetchTables();
      await fetchSummary();
      if (receptionSearchQuery.value.trim()) {
        await searchReception();
      } else {
        await loadUpcomingArrivals();
      }
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
      if (receptionTab.value === "walkin") {
        ElMessage.error(err.response?.data?.message || "Không thể tải bàn trống");
      }
    } finally {
      walkInTablesLoading.value = false;
    }
  };

  const isWalkInTableSelected = (tableId) => walkInSelectedTableIds.value.includes(tableId);

  const toggleWalkInTable = (tableId) => {
    if (isWalkInTableSelected(tableId)) {
      walkInSelectedTableIds.value = walkInSelectedTableIds.value.filter((id) => id !== tableId);
      return;
    }
    walkInSelectedTableIds.value = [...walkInSelectedTableIds.value, tableId];
  };

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
          table_id: walkInSelectedTableIds.value[0],
          table_ids: walkInSelectedTableIds.value,
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

  const openTableAfterReception = (tableInfo) => {
    if (!tableInfo?.table_number) return;
    const found = tables.value.find((t) => t.table_number === tableInfo.table_number);
    if (found) {
      showReceptionDialog.value = false;
      viewTableDetail(found);
    }
  };

  const handleBranchChange = () => {
    tableCurrentPage.value = 1;
    filterStatus.value = "";
    searchQuery.value = "";
    selectedTable.value = null;
    showDetailDialog.value = false;
    fetchTables();
    fetchSummary();
  };

  let refreshTimer = null;
  let disposeTablesWs = null;

  function getTablesPollIntervalMs() {
    const r = userRole.value;
    if (r === "waiter" || r === "kitchen") return 4000;
    return 12000;
  }

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

  function onTablesRealtimeMsg(msg) {
    if (msg?.type !== "order_item_status" && msg?.type !== "order_flow") return;
    handleKitchenRealtimeMessage(msg);
    pollTablesSyncTick();
  }

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

  function startTablesPollingAndWs() {
    stopTablesPollingAndWs();
    refreshTimer = setInterval(pollTablesSyncTick, getTablesPollIntervalMs());
    disposeTablesWs = connectBranchRealtime(API_ORIGIN, selectedBranchId.value, onTablesRealtimeMsg);
  }

  watch(selectedBranchId, () => {
    startTablesPollingAndWs();
  });

  watch(tablePageSize, () => {
    clampTablePage();
  });

  onMounted(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    userRole.value = user?.role || "";
    if (user?.role !== "admin" && user?.branch_id) {
      selectedBranchId.value = Number(user.branch_id) || 1;
    }
    fetchBranches().then(() => {
      fetchTables();
      fetchSummary();
      startTablesPollingAndWs();
    });

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
  };
}
