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

const tablesContext = useAdminTablesPage();
provideTablesContext(tablesContext);

const { tableCurrentPage, tablePaginationTotalPages } = tablesContext;
</script>
