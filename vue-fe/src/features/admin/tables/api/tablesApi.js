/**
 * TABLES API ENDPOINTS — gom sẵn URL các nhóm API dùng ở màn quản lý bàn/phục vụ,
 * để composable/component chỉ import hằng thay vì ghép chuỗi thủ công nhiều nơi.
 */
import { API_ORIGIN } from "@/config/api";

export const TABLE_API = `${API_ORIGIN}/api/admin/table`;      // CRUD + sơ đồ bàn
export const WAITER_API = `${API_ORIGIN}/api/admin/waiter`;    // nghiệp vụ phục vụ (gọi món, thanh toán)
export const RECEPTION_API = `${API_ORIGIN}/api/admin/reception`; // tiếp nhận/check-in
export const BRANCH_API = `${API_ORIGIN}/api/home/branches`;   // danh sách chi nhánh
