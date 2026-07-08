/**
 * TABLES CONTEXT — provide/inject dùng chung state của trang quản lý bàn cho các component con,
 * tránh phải truyền props qua nhiều tầng (prop drilling).
 */
import { inject, provide } from "vue";

// Symbol làm key duy nhất cho context (không trùng với key khác).
export const TablesContextKey = Symbol("TablesContext");

/** Component cha (AdminTablesPage) gọi để chia sẻ context xuống dưới. */
export function provideTablesContext(context) {
  provide(TablesContextKey, context);
}

/** Component con gọi để lấy context; ném lỗi rõ ràng nếu dùng ngoài cây AdminTablesPage. */
export function useTablesContext() {
  const context = inject(TablesContextKey);
  if (!context) {
    throw new Error("useTablesContext must be used within AdminTablesPage");
  }
  return context;
}
