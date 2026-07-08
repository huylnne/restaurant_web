/**
 * useMenuPage — logic dùng chung cho trang thực đơn ở 2 chế độ:
 *  - mode "public": khách xem menu + bấm gọi món (nếu đã đặt bàn).
 *  - mode "admin" : admin/manager thêm/sửa/xóa món.
 * Bao gồm: lọc theo danh mục, phân trang co giãn theo kích thước lưới, chọn chi nhánh, và CRUD món.
 */
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

  // Đọc 1 biến CSS dạng px (ví dụ --hl-admin-grid-min: 260px) → trả về số; lỗi thì dùng fallback.
  function readCssPxVar(name, fallback) {
    if (typeof document === "undefined") return fallback; // môi trường SSR không có document
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  // Tính số cột của lưới món theo bề rộng hiện có.
  function getMenuGridCols(width, adminView) {
    if (adminView) {
      // Chế độ admin: lưới auto-fill theo CSS var → tự suy số cột từ (bề rộng + gap)/(card tối thiểu + gap).
      const minCard = readCssPxVar("--hl-admin-grid-min", 260);
      const gap = readCssPxVar("--hl-admin-grid-gap", 20);
      return Math.max(1, Math.floor((width + gap) / (minCard + gap)));
    }
    // Chế độ public: breakpoint cố định theo bề rộng.
    if (width > 1200) return 5;
    if (width > 992) return 4;
    if (width > 768) return 3;
    if (width > 640) return 2;
    return 1;
  }

  // Tính số món/trang (pageSize) sao cho lấp vừa vùng hiển thị: số cột × số hàng ước lượng.
  // Mục đích: menu luôn kín màn hình, không thừa khoảng trống, không phải cuộn nhiều.
  function computeMenuPageSize() {
    const el = dishListRef.value;
    if (!el || typeof window === "undefined") return;
    const w = el.clientWidth;
    if (w < 80) return; // phần tử chưa render đủ rộng thì bỏ qua

    const cols = getMenuGridCols(w, isAdminView.value); // số cột theo bề rộng

    // Ước lượng chiều cao còn lại của viewport (trừ vị trí lưới và chừa 100px dưới) → suy ra số hàng.
    const rect = el.getBoundingClientRect();
    const reserveBottom = 100;
    const availH = Math.max(320, window.innerHeight - rect.top - reserveBottom);
    const estRowH = isAdminView.value ? 320 : 300; // chiều cao ước lượng 1 hàng card
    const rows = Math.max(2, Math.min(8, Math.floor(availH / estRowH))); // kẹp 2..8 hàng

    // pageSize = cols*rows, tối thiểu 2 hàng, tối đa 100.
    const next = Math.min(100, Math.max(cols * rows, cols * 2));
    if (pageSize.value !== next) {
      pageSize.value = next;
    }
  }

  // Nếu trang hiện tại vượt quá số trang tối đa (do đổi bộ lọc/pageSize) → kéo về trang cuối hợp lệ.
  function clampMenuPage() {
    const total = filteredAllItems.value.length;
    const maxPage = Math.max(1, Math.ceil(total / pageSize.value));
    if (currentPage.value > maxPage) {
      currentPage.value = maxPage;
    }
  }

  // Gọi mỗi khi lưới đổi kích thước: tính lại pageSize rồi kẹp lại currentPage.
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

  // Khi component gắn vào DOM: xác định quyền quản lý, nạp chi nhánh + món, và gắn theo dõi resize.
  onMounted(async () => {
    const token = localStorage.getItem("token");
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const role = storedUser?.role;

    // Chỉ ở mode admin và đúng vai trò (admin/manager) mới được thao tác CRUD.
    if (mode === "admin") {
      canManage.value = !!token && ["admin", "manager"].includes(role);
    } else {
      canManage.value = false;
    }

    await fetchBranches();       // 1) nạp danh sách chi nhánh (và chọn chi nhánh mặc định)
    await fetchAllMenuItems();   // 2) nạp toàn bộ món của chi nhánh đang chọn
    await nextTick();            // 3) chờ DOM cập nhật rồi mới đo kích thước lưới
    onMenuGridLayoutTick();      // 4) tính pageSize lần đầu

    // Theo dõi thay đổi kích thước của lưới (đóng/mở sidebar, kéo cửa sổ...) để tính lại pageSize.
    if (dishListRef.value && typeof ResizeObserver !== "undefined") {
      menuGridResizeObserver = new ResizeObserver(onMenuGridLayoutTick);
      menuGridResizeObserver.observe(dishListRef.value);
    }
    window.addEventListener("resize", onMenuGridLayoutTick);
  });

  // Dọn dẹp observer + listener khi rời trang để tránh rò rỉ bộ nhớ.
  onUnmounted(() => {
    menuGridResizeObserver?.disconnect();
    window.removeEventListener("resize", onMenuGridLayoutTick);
  });

  // Nạp danh sách chi nhánh và quyết định chi nhánh nào đang được chọn.
  const fetchBranches = async () => {
    try {
      const res = await axios.get("/api/home/branches");
      branches.value = Array.isArray(res.data) ? res.data : [];
      if (!isSuperAdmin) {
        // Admin thường bị khóa vào chi nhánh của họ.
        selectedBranchId.value = getDefaultBranchIdForUser(user);
      } else if (branches.value.length && !branches.value.some((b) => b.branch_id === selectedBranchId.value)) {
        // Super admin: nếu chi nhánh đang chọn không còn tồn tại → chọn chi nhánh đầu tiên.
        selectedBranchId.value = branches.value[0].branch_id;
      }
      // Nếu URL có ?branch_id hợp lệ thì ưu tiên theo URL (cho phép chia sẻ link).
      const fromQuery = Number(route.query.branch_id);
      if (fromQuery && branches.value.some((b) => b.branch_id === fromQuery)) {
        selectedBranchId.value = fromQuery;
      }
    } catch {
      branches.value = [];
    }
  };

  // Đổi chi nhánh → nạp lại menu của chi nhánh mới.
  const onBranchChange = () => {
    fetchAllMenuItems();
  };

  // Nạp toàn bộ món (limit lớn 1000) của chi nhánh đang chọn về client, rồi lọc/phân trang tại chỗ.
  const fetchAllMenuItems = async () => {
    try {
      const res = await axios.get("/api/menu-items", {
        params: { limit: 1000, branch_id: selectedBranchId.value },
      });
      allMenuItems.value = res.data.items || [];
      await nextTick();
      onMenuGridLayoutTick(); // dữ liệu đổi → tính lại pageSize/trang
    } catch (err) {
      console.error("Lỗi khi lấy menu:", err);
    }
  };

  // Danh sách món sau khi lọc theo danh mục đang chọn (rỗng = tất cả).
  const filteredAllItems = computed(() => {
    let items = allMenuItems.value;
    if (selectedCategory.value) {
      items = items.filter((item) => item.category === selectedCategory.value);
    }
    return items;
  });

  // Tổng số trang = ceil(số món đã lọc / pageSize), tối thiểu 1.
  const totalPages = computed(() =>
    Math.max(1, Math.ceil(filteredAllItems.value.length / pageSize.value))
  );

  // Cắt lấy đúng phần món của trang hiện tại (phân trang phía client).
  const filteredMenuItems = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredAllItems.value.slice(start, start + pageSize.value);
  });

  // Danh sách lọc hoặc pageSize đổi → đảm bảo currentPage không vượt quá trang cuối.
  watch([filteredAllItems, pageSize], () => {
    clampMenuPage();
  });

  // Chọn danh mục để lọc; luôn quay về trang 1.
  const selectCategory = (category) => {
    selectedCategory.value = category;
    currentPage.value = 1;
  };

  // Chỉ đơn ở trạng thái pending/confirmed mới cho phép đặt món trước (pre-order).
  const canPreOrderForReservation = (order) =>
    ["pending", "confirmed"].includes(String(order?.status || "").toLowerCase());

  // Khách bấm "Gọi món" trên 1 món: chỉ cho phép nếu đang có đơn đặt bàn còn ở trạng thái đặt món trước.
  const handleOrderClick = (dish) => {
    const order = JSON.parse(localStorage.getItem("activeOrder") || "null");
    if (order && canPreOrderForReservation(order)) {
      // Nhớ tạm món vừa chọn để trang OrderMenu tự thêm vào giỏ khi mở.
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
      // Chưa đặt bàn → nhắc đặt trước.
      ElMessage.warning("Vui lòng đặt bàn trước khi gọi món.");
    }
  };

  // Mở modal thêm mới: reset form về mặc định, gán chi nhánh đang chọn.
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

  // Mở modal sửa: đổ dữ liệu món đang chọn vào form (item_id hoặc id tùy nguồn dữ liệu).
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

  // Xóa món: hỏi xác nhận trước; nếu người dùng bấm Hủy (throw) thì dừng, không gọi API.
  const confirmDelete = async (dish) => {
    const dishId = dish.item_id || dish.id;
    try {
      await ElMessageBox.confirm(`Bạn có chắc muốn xóa món "${dish.name}"?`, "Xác nhận xóa", {
        confirmButtonText: "Xóa",
        cancelButtonText: "Hủy",
        type: "warning",
      });
    } catch {
      return; // người dùng bấm Hủy
    }
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/admin/menu/${dishId}`, {
        params: { branchId: selectedBranchId.value },
        headers: { Authorization: `Bearer ${token}` },
      });
      ElMessage.success("Xóa món ăn thành công!");
      fetchAllMenuItems(); // nạp lại danh sách sau khi xóa
    } catch (error) {
      ElMessage.error(error.response?.data?.message || error.message || "Có lỗi xảy ra");
    }
  };

  // Gửi form thêm/sửa món. submitting để khóa nút tránh double-submit.
  const handleSubmit = async () => {
    try {
      submitting.value = true;
      const token = localStorage.getItem("token");
      // Chuẩn hóa payload: sale_price chỉ nhận số > 0, còn lại đưa về null.
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
      // Ràng buộc: giá sale phải NHỎ HƠN giá gốc (nếu có nhập sale).
      if (
        payload.sale_price != null &&
        Number.isFinite(payload.sale_price) &&
        payload.sale_price >= payload.price
      ) {
        ElMessage.warning("Giá khuyến mãi phải nhỏ hơn giá gốc.");
        submitting.value = false;
        return;
      }
      // edit → PUT (cập nhật theo id), add → POST (tạo mới).
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
      fetchAllMenuItems(); // nạp lại danh sách để thấy thay đổi
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
