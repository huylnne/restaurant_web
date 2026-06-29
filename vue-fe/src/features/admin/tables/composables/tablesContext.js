import { inject, provide } from "vue";

export const TablesContextKey = Symbol("TablesContext");

export function provideTablesContext(context) {
  provide(TablesContextKey, context);
}

export function useTablesContext() {
  const context = inject(TablesContextKey);
  if (!context) {
    throw new Error("useTablesContext must be used within AdminTablesPage");
  }
  return context;
}
