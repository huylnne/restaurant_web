<template>
  <div class="admin-tables">
    <TablesPageHeader />
    <TablesSummaryCards />
    <TablesFilterBar />
    <TablesGrid />

    <PaginationBar
      v-if="tablePaginationTotalPages > 1"
      :current-page="tableCurrentPage"
      :total-pages="tablePaginationTotalPages"
      @update:current-page="tableCurrentPage = $event"
    />

    <AddTableDialog />
    <TableDetailDialog />
    <QrDialog />
    <CreateOrderDialog />
    <ReceptionDialog />
    <EditTableDialog />
  </div>
</template>

<script setup>
// AdminTablesPage — trang gốc màn Quản lý bàn. Chỉ đóng vai "nhạc trưởng":
//  1) Gọi composable useAdminTablesPage() để lấy toàn bộ state + hàm nghiệp vụ.
//  2) provideTablesContext() để chia sẻ xuống mọi component/dialog con (không cần truyền props).
//  3) Ghép các mảnh giao diện (header, thẻ thống kê, bộ lọc, lưới, phân trang, các dialog).
import PaginationBar from "@/components/PaginationBar.vue";
import { useAdminTablesPage } from "../composables/useAdminTablesPage";
import { provideTablesContext } from "../composables/tablesContext";
import TablesPageHeader from "../components/TablesPageHeader.vue";
import TablesSummaryCards from "../components/TablesSummaryCards.vue";
import TablesFilterBar from "../components/TablesFilterBar.vue";
import TablesGrid from "../components/TablesGrid.vue";
import AddTableDialog from "../dialogs/AddTableDialog.vue";
import TableDetailDialog from "../dialogs/TableDetailDialog.vue";
import QrDialog from "../dialogs/QrDialog.vue";
import CreateOrderDialog from "../dialogs/CreateOrderDialog.vue";
import ReceptionDialog from "../dialogs/ReceptionDialog.vue";
import EditTableDialog from "../dialogs/EditTableDialog.vue";
import "../styles/admin-tables.css";

const tablesContext = useAdminTablesPage(); // tạo state + logic một lần
provideTablesContext(tablesContext);         // chia sẻ cho cây con

// Chỉ trang gốc cần trực tiếp 2 giá trị này để render thanh phân trang.
const { tableCurrentPage, tablePaginationTotalPages } = tablesContext;
</script>
