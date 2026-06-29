<template>
  <div class="header">
    <div class="title-section">
      <h2>Quản lý bàn ăn</h2>
      <p>Quản lý và theo dõi tình trạng bàn ăn trong nhà hàng</p>
    </div>
    <div class="header-actions admin-toolbar">
      <el-select
        v-model="selectedBranchId"
        placeholder="Chọn chi nhánh"
        class="branch-select"
        :disabled="userRole !== 'admin'"
        @change="handleBranchChange"
      >
        <el-option
          v-for="branch in branches"
          :key="branch.branch_id"
          :label="branch.name"
          :value="branch.branch_id"
        />
      </el-select>
      <el-button :icon="Refresh" @click="() => { fetchTables(); fetchSummary(); }" title="Làm mới">
        Làm mới
      </el-button>
      <el-button type="success" @click="openReceptionDialog">
        <el-icon><UserFilled /></el-icon>
        Tiếp nhận khách
      </el-button>
      <el-button v-if="userRole === 'admin'" type="warning" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon>
        Đặt bàn mới
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { Plus, UserFilled, Refresh } from "@element-plus/icons-vue";
import { useTablesContext } from "../composables/tablesContext";

const {
  selectedBranchId,
  userRole,
  branches,
  showAddDialog,
  fetchTables,
  fetchSummary,
  handleBranchChange,
  openReceptionDialog,
} = useTablesContext();
</script>
