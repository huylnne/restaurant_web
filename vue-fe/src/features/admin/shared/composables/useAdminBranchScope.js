import { ref } from "vue";
import axios from "axios";
import { API_ORIGIN } from "@/config/api";
import {
  getCurrentUser,
  isSuperAdminUser,
  getDefaultBranchIdForUser,
} from "@/features/admin/shared/utils/adminScope";

/**
 * Chi nhánh cho trang admin — fetch branches + selectedBranchId + role scope.
 */
export function useAdminBranchScope(options = {}) {
  const { onBranchChange } = options;
  const currentUser = getCurrentUser();
  const isSuperAdmin = isSuperAdminUser(currentUser);
  const branches = ref([]);
  const selectedBranchId = ref(getDefaultBranchIdForUser(currentUser));

  async function fetchBranches() {
    try {
      const res = await axios.get(`${API_ORIGIN}/api/home/branches`);
      branches.value = Array.isArray(res.data) ? res.data : [];
      if (!isSuperAdmin && currentUser?.branch_id) {
        // Không phải super admin: khóa cứng về chi nhánh của tài khoản (không cho chọn chi nhánh khác).
        selectedBranchId.value = Number(currentUser.branch_id) || 1;
      } else if (
        branches.value.length &&
        !branches.value.some((b) => b.branch_id === selectedBranchId.value)
      ) {
        // Super admin: nếu chi nhánh đang chọn không còn trong danh sách → chọn chi nhánh đầu tiên.
        selectedBranchId.value = branches.value[0].branch_id;
      }
    } catch {
      branches.value = []; // lỗi API → để rỗng, tránh vỡ giao diện
    }
  }

  function handleBranchChange() {
    onBranchChange?.(selectedBranchId.value);
  }

  return {
    currentUser,
    isSuperAdmin,
    branches,
    selectedBranchId,
    fetchBranches,
    handleBranchChange,
  };
}
