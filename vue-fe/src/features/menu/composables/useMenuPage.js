import { ref, reactive, onMounted, onUnmounted, computed, watch, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import { CoffeeCup, KnifeFork, IceCream, GobletFull } from "@element-plus/icons-vue";
import { getCurrentUser, isSuperAdminUser, getDefaultBranchIdForUser } from "@/utils/adminScope";

export function useMenuPage({ mode }) {
  const router = useRouter();
  const route = useRoute();

  const categoryOptions = [
    { value: "", label: "Tất cả", icon: null },
    { value: "Khai vị", label: "Khai vị", icon: CoffeeCup },
    { value: "Món chính", label: "Món chính", icon: KnifeFork },
    { value: "Tráng miệng", label: "Tráng miệng", icon: IceCream },
    { value: "Đồ uống", label: "Đồ uống", icon: GobletFull },
  ];

  const isAdminView = ref(mode === "admin");
  const canManage = ref(false);
  const user = getCurrentUser();
  const isSuperAdmin = isSuperAdminUser(user);
  const branches = ref([]);
  const selectedBranchId = ref(getDefaultBranchIdForUser(user));

  const isAdmin = canManage;

  const selectedCategory = ref("");
  const allMenuItems = ref([]);
  const currentPage = ref(1);
  const dishListRef = ref(null);
  const pageSize = ref(12);
  let menuGridResizeObserver = null;

  function readCssPxVar(name, fallback) {
    if (typeof document === "undefined") return fallback;
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  function getMenuGridCols(width, adminView) {
    if (adminView) {
      const minCard = readCssPxVar("--hl-admin-grid-min", 260);
      const gap = readCssPxVar("--hl-admin-grid-gap", 20);
      return Math.max(1, Math.floor((width + gap) / (minCard + gap)));
    }
    if (width > 1200) return 5;
    if (width > 992) return 4;
    if (width > 768) return 3;
    if (width > 640) return 2;
    return 1;
  }

  function computeMenuPageSize() {
    const el = dishListRef.value;
    if (!el || typeof window === "undefined") return;
    const w = el.clientWidth;
    if (w < 80) return;

    const cols = getMenuGridCols(w, isAdminView.value);

    const rect = el.getBoundingClientRect();
    const reserveBottom = 100;
    const availH = Math.max(320, window.innerHeight - rect.top - reserveBottom);
    const estRowH = isAdminView.value ? 320 : 300;
    const rows = Math.max(2, Math.min(8, Math.floor(availH / estRowH)));

    const next = Math.min(100, Math.max(cols * rows, cols * 2));
    if (pageSize.value !== next) {
      pageSize.value = next;
    }
  }

  function clampMenuPage() {
    const total = filteredAllItems.value.length;
    const maxPage = Math.max(1, Math.ceil(total / pageSize.value));
    if (currentPage.value > maxPage) {
      currentPage.value = maxPage;
    }
  }

  function onMenuGridLayoutTick() {
    computeMenuPageSize();
    clampMenuPage();
  }

  const showModal = ref(false);
  const modalMode = ref("add");
  const submitting = ref(false);

  const formState = reactive({
    id: null,
    name: "",
    description: "",
    price: 0,
    sale_price: null,
    category: "Món chính",
    image_url: "",
    branch_id: 1,
  });

  onMounted(async () => {
    const token = localStorage.getItem("token");
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const role = storedUser?.role;

    if (mode === "admin") {
      canManage.value = !!token && ["admin", "manager"].includes(role);
    } else {
      canManage.value = false;
    }

    await fetchBranches();
    await fetchAllMenuItems();
    await nextTick();
    onMenuGridLayoutTick();
    if (dishListRef.value && typeof ResizeObserver !== "undefined") {
      menuGridResizeObserver = new ResizeObserver(onMenuGridLayoutTick);
      menuGridResizeObserver.observe(dishListRef.value);
    }
    window.addEventListener("resize", onMenuGridLayoutTick);
  });

  onUnmounted(() => {
    menuGridResizeObserver?.disconnect();
    window.removeEventListener("resize", onMenuGridLayoutTick);
  });

  const fetchBranches = async () => {
    try {
      const res = await axios.get("/api/home/branches");
      branches.value = Array.isArray(res.data) ? res.data : [];
      if (!isSuperAdmin) {
        selectedBranchId.value = getDefaultBranchIdForUser(user);
      } else if (branches.value.length && !branches.value.some((b) => b.branch_id === selectedBranchId.value)) {
        selectedBranchId.value = branches.value[0].branch_id;
      }
      const fromQuery = Number(route.query.branch_id);
      if (fromQuery && branches.value.some((b) => b.branch_id === fromQuery)) {
        selectedBranchId.value = fromQuery;
      }
    } catch {
      branches.value = [];
    }
  };

  const onBranchChange = () => {
    fetchAllMenuItems();
  };

  const fetchAllMenuItems = async () => {
    try {
      const res = await axios.get("/api/menu-items", {
        params: { limit: 1000, branch_id: selectedBranchId.value },
      });
      allMenuItems.value = res.data.items || [];
      await nextTick();
      onMenuGridLayoutTick();
    } catch (err) {
      console.error("Lỗi khi lấy menu:", err);
    }
  };

  const filteredAllItems = computed(() => {
    let items = allMenuItems.value;
    if (selectedCategory.value) {
      items = items.filter((item) => item.category === selectedCategory.value);
    }
    return items;
  });

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(filteredAllItems.value.length / pageSize.value))
  );

  const filteredMenuItems = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredAllItems.value.slice(start, start + pageSize.value);
  });

  watch([filteredAllItems, pageSize], () => {
    clampMenuPage();
  });

  const selectCategory = (category) => {
    selectedCategory.value = category;
    currentPage.value = 1;
  };

  const canPreOrderForReservation = (order) =>
    ["pending", "confirmed"].includes(String(order?.status || "").toLowerCase());

  const handleOrderClick = (dish) => {
    const order = JSON.parse(localStorage.getItem("activeOrder") || "null");
    if (order && canPreOrderForReservation(order)) {
      if (dish?.item_id) {
        sessionStorage.setItem(
          "pendingOrderDish",
          JSON.stringify({ item_id: dish.item_id, name: dish.name, ...dish })
        );
      }
      router.push({
        name: "OrderMenu",
        query: {
          order_id: order.order_id,
          branch_id: order.branch_id,
        },
      });
    } else {
      ElMessage.warning("Vui lòng đặt bàn trước khi gọi món.");
    }
  };

  const openAddModal = () => {
    modalMode.value = "add";
    Object.assign(formState, {
      id: null,
      name: "",
      description: "",
      price: 0,
      sale_price: null,
      category: "Món chính",
      image_url: "",
      branch_id: selectedBranchId.value,
    });
    showModal.value = true;
  };

  const openEditModal = (dish) => {
    modalMode.value = "edit";
    Object.assign(formState, {
      id: dish.item_id || dish.id,
      name: dish.name,
      description: dish.description,
      price: dish.price,
      sale_price: dish.sale_price ?? null,
      category: dish.category,
      image_url: dish.image_url,
      branch_id: dish.branch_id || selectedBranchId.value,
    });
    showModal.value = true;
  };

  const closeModal = () => {
    showModal.value = false;
  };

  const confirmDelete = async (dish) => {
    const dishId = dish.item_id || dish.id;
    try {
      await ElMessageBox.confirm(`Bạn có chắc muốn xóa món "${dish.name}"?`, "Xác nhận xóa", {
        confirmButtonText: "Xóa",
        cancelButtonText: "Hủy",
        type: "warning",
      });
    } catch {
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/admin/menu/${dishId}`, {
        params: { branchId: selectedBranchId.value },
        headers: { Authorization: `Bearer ${token}` },
      });
      ElMessage.success("Xóa món ăn thành công!");
      fetchAllMenuItems();
    } catch (error) {
      ElMessage.error(error.response?.data?.message || error.message || "Có lỗi xảy ra");
    }
  };

  const handleSubmit = async () => {
    try {
      submitting.value = true;
      const token = localStorage.getItem("token");
      const payload = {
        name: formState.name,
        description: formState.description,
        price: formState.price,
        sale_price:
          formState.sale_price != null &&
          formState.sale_price !== "" &&
          Number(formState.sale_price) > 0
            ? Number(formState.sale_price)
            : null,
        category: formState.category,
        image_url: formState.image_url,
        branch_id: selectedBranchId.value,
      };
      if (
        payload.sale_price != null &&
        Number.isFinite(payload.sale_price) &&
        payload.sale_price >= payload.price
      ) {
        ElMessage.warning("Giá khuyến mãi phải nhỏ hơn giá gốc.");
        submitting.value = false;
        return;
      }
      if (modalMode.value === "edit") {
        await axios.put(`/api/admin/menu/${formState.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        ElMessage.success("Cập nhật món ăn thành công!");
      } else {
        await axios.post("/api/admin/menu", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        ElMessage.success("Thêm món ăn thành công!");
      }
      showModal.value = false;
      fetchAllMenuItems();
    } catch (error) {
      ElMessage.error(error.response?.data?.message || error.message || "Có lỗi xảy ra");
    } finally {
      submitting.value = false;
    }
  };

  return {
    categoryOptions,
    isAdminView,
    canManage,
    isAdmin,
    isSuperAdmin,
    branches,
    selectedBranchId,
    selectedCategory,
    allMenuItems,
    currentPage,
    dishListRef,
    pageSize,
    showModal,
    modalMode,
    submitting,
    formState,
    filteredAllItems,
    totalPages,
    filteredMenuItems,
    onBranchChange,
    selectCategory,
    handleOrderClick,
    openAddModal,
    openEditModal,
    closeModal,
    confirmDelete,
    handleSubmit,
  };
}
