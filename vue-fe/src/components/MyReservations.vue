<template>
  <el-card>
    <h2 class="title">Lịch sử đặt bàn</h2>
    <el-table :data="reservations" v-loading="loading" style="width: 100%">
      <el-table-column prop="reservation_time" label="Thời gian" width="200">
        <template #default="{ row }">
          {{ new Date(row.reservation_time).toLocaleString("vi-VN") }}
        </template>
      </el-table-column>

      <el-table-column prop="number_of_guests" label="Số khách" width="100" />
      <el-table-column prop="Table.table_number" label="Bàn số" />
      <el-table-column prop="Table.capacity" label="Sức chứa" />
      <el-table-column prop="status" label="Trạng thái" />
      <el-table-column prop="note" label="Ghi chú" />

      <!-- ✅ Món đã gọi -->
      <el-table-column label="Món đã gọi">
        <template #default="{ row }">
          <div v-if="row.Orders?.length">
            <div v-for="order in row.Orders" :key="order.order_id" class="order-items">
              <div
                v-for="item in order.OrderItems"
                :key="item.order_item_id"
                class="order-item"
              >
                🍽️ {{ item.MenuItem?.name }} <strong>(x{{ item.quantity }})</strong>
              </div>
            </div>
            <!-- 💰 Hoá đơn tạm tính -->
            <div class="invoice">
              💰 <strong>Tạm tính:</strong>
              {{
                calculateSubtotal(row.Orders).toLocaleString("vi-VN", {
                  style: "currency",
                  currency: "VND",
                })
              }}
            </div>
          </div>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <!-- ❌ Hủy đặt bàn -->
      <el-table-column label="Hành động" width="150">
        <template #default="{ row }">
          <el-button
            v-if="['pending', 'confirmed'].includes(row.status?.trim().toLowerCase())"
            type="danger"
            size="small"
            @click="cancelReservation(row.reservation_id)"
          >
            Hủy
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";

const reservations = ref([]);
const loading = ref(true);

async function fetchReservations() {
  try {
    loading.value = true;
    const token = localStorage.getItem("token");
    const res = await axios.get("/api/users/reservations", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("🎯 API reservations trả về:", res.data);
    reservations.value = res.data.reservations || res.data;
  } catch (err) {
    console.error("Lỗi khi lấy reservations:", err);
    ElMessage.error(err.response?.data?.message || "Lỗi tải dữ liệu");
  } finally {
    loading.value = false;
  }
}

async function cancelReservation(id) {
  try {
    await ElMessageBox.confirm("Bạn có chắc chắn muốn hủy đặt bàn này?", "Xác nhận hủy", {
      confirmButtonText: "Hủy bàn",
      cancelButtonText: "Không",
      type: "warning",
    });
    const token = localStorage.getItem("token");
    await axios.put(
      `/api/reservations/${id}/cancel`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    ElMessage.success("Hủy đặt bàn thành công");
    fetchReservations();
  } catch (err) {
    if (err !== "cancel") {
      ElMessage.error(err.response?.data?.message || "Lỗi khi hủy đặt bàn");
    }
  }
}

function calculateSubtotal(orders) {
  if (!orders || !Array.isArray(orders)) return 0;

  return orders.reduce((sum, order) => {
    return (
      sum +
      order.OrderItems.reduce((orderSum, item) => {
        const price = Number(item.MenuItem?.price || 0);
        const quantity = Number(item.quantity || 0);
        return orderSum + price * quantity;
      }, 0)
    );
  }, 0);
}

onMounted(fetchReservations);
</script>

<style scoped>
.title {
  font-size: 20px;
  margin-bottom: 16px;
  color: #a16500;
}

.order-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
}

.order-item {
  font-size: 14px;
  line-height: 1.4;
}

.invoice {
  margin-top: 6px;
  padding-top: 4px;
  font-weight: bold;
  font-size: 14px;
  color: #4caf50;
  border-top: 1px dashed #ccc;
}
</style>
