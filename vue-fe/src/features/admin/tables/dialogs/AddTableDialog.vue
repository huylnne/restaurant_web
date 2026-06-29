<template>
  <el-dialog v-model="showAddDialog" title="Thêm bàn mới" width="500px">
    <el-form :model="newTable" label-width="120px">
      <el-form-item label="Số bàn">
        <el-input
          v-model.number="newTable.table_number"
          type="number"
          placeholder="Nhập số bàn"
        />
      </el-form-item>
      <el-form-item label="Số ghế">
        <el-input
          v-model.number="newTable.capacity"
          type="number"
          :placeholder="`${TABLE_CAPACITY} chỗ (cố định)`"
          disabled
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="showAddDialog = false">Hủy</el-button>
      <el-button type="primary" @click="addTable">Thêm bàn</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { useTablesContext } from "../composables/tablesContext";

const { showAddDialog, newTable, TABLE_CAPACITY, addTable } = useTablesContext();
</script>
