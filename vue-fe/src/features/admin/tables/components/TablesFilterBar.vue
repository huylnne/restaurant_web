<template>
  <div class="filter-section">
    <el-input
      v-model="searchQuery"
      placeholder="Tìm kiếm bàn..."
      :prefix-icon="Search"
      clearable
      @input="filterTables"
    />
    <el-select v-model="filterStatus" placeholder="Tất cả bàn" @change="filterTables">
      <el-option label="Tất cả bàn" value="" />
      <el-option label="Bàn trống" value="available" />
      <el-option label="Đang phục vụ" value="occupied" />
      <el-option label="Đã đặt" value="pre-ordered" />
      <el-option label="Chờ dọn" value="cleaning" />
    </el-select>
  </div>
</template>

<script setup>
import { Search } from "@element-plus/icons-vue";
import { useTablesContext } from "../composables/tablesContext";

const { searchQuery, filterStatus, filterTables } = useTablesContext();
</script>
