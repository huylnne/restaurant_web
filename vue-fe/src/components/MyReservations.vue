<template>
  <el-card>
    <h2 class="title">Lịch sử đặt bàn</h2>
    <el-table :data="reservations" v-loading="loading" style="width: 100%">
      <el-table-column prop="reservation_time" label="Thời gian" width="200">
        <template #default="{ row }">
          {{ new Date(row.reservation_time).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column prop="number_of_guests" label="Số khách" width="100" />
      <el-table-column prop="Table.table_number" label="Bàn số" />
      <el-table-column prop="Table.capacity" label="Sức chứa" />
      <el-table-column prop="status" label="Trạng thái" />
      <el-table-column prop="note" label="Ghi chú" />
    </el-table>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";

const reservations = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get("/api/reservations/my", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    reservations.value = res.data.reservations;
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.title {
  font-size: 20px;
  margin-bottom: 16px;
  color: #a16500;
}
</style>
