<template>
  <section class="home-nearby">
    <div class="home-nearby__header">
      <div>
        <h2 class="section-title section-title--decorated">Chi nhánh gần bạn</h2>
        <p class="home-nearby__desc">
          Cho phép truy cập vị trí để gợi ý chi nhánh {{ BRAND.name }} gần nhất.
        </p>
      </div>
      <router-link to="/branches/nearby">
        <el-button type="primary" size="large" :icon="Location">Xem theo vị trí</el-button>
      </router-link>
    </div>

    <!-- Đang xin/định vị GPS -->
    <div v-if="phase === 'locating'" class="home-nearby__state">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>Đang lấy vị trí...</span>
    </div>

    <!-- Người dùng từ chối chia sẻ vị trí (hoặc lỗi định vị) -->
    <div v-else-if="phase === 'denied'" class="home-nearby__state home-nearby__state--muted">
      <p>{{ errorMsg }}</p>
      <router-link to="/branches/nearby">
        <el-button type="primary" plain size="small">Xem chi nhánh gần bạn</el-button>
      </router-link>
    </div>

    <!-- Có kết quả: hiện lưới chi nhánh gần nhất (chi nhánh đầu tiên gắn nhãn "Gần nhất") -->
    <div v-else-if="nearbyPreview.length" class="home-nearby__grid">
      <router-link
        v-for="(b, i) in nearbyPreview"
        :key="b.branch_id"
        to="/branches/nearby"
        class="home-nearby__card hl-card"
      >
        <span v-if="i === 0" class="home-nearby__badge">Gần nhất</span>
        <h3>{{ b.name }}</h3>
        <p v-if="b.distance_km != null" class="home-nearby__km">
          {{ formatDistanceKm(b.distance_km) }}
        </p>
        <p class="home-nearby__addr">{{ b.address }}</p>
        <el-tag :type="tableTagType(b)" size="small">
          {{ b.available_tables ?? 0 }}/{{ b.total_tables ?? 0 }} bàn trống
        </el-tag>
      </router-link>
    </div>

    <p class="home-nearby__catalog">
      Muốn xem toàn bộ?
      <router-link to="/branches">Danh sách chi nhánh →</router-link>
    </p>
  </section>
</template>

<script setup>
// HomeNearbySection — khối "Chi nhánh gần bạn" ở trang chủ: xin vị trí GPS rồi gợi ý vài chi nhánh gần nhất.
// Máy trạng thái phase: idle → locating → (ready | empty | denied).
import { ref, computed, onMounted } from "vue";
import axios from "axios";
import { Location, Loading } from "@element-plus/icons-vue";
import { BRAND } from "@/config/siteContent";
import { getUserPosition, formatDistanceKm } from "@/utils/geo";

const props = defineProps({
  limit: { type: Number, default: 2 }, // số chi nhánh xem trước tối đa
});

const phase = ref("idle");   // trạng thái hiển thị hiện tại
const errorMsg = ref("");    // thông báo lỗi khi định vị thất bại
const branches = ref([]);    // toàn bộ chi nhánh gần nhất trả về
// Chỉ lấy `limit` chi nhánh đầu để xem trước ở trang chủ.
const nearbyPreview = computed(() => branches.value.slice(0, props.limit));

// Gọi API tìm chi nhánh gần toạ độ (lat, lng); có kết quả → "ready", rỗng → "empty".
async function fetchNearby(lat, lng) {
  const res = await axios.get("/api/home/branches/nearby", { params: { lat, lng } });
  branches.value = res.data?.branches ?? [];
  phase.value = branches.value.length ? "ready" : "empty";
}

// Màu tag "bàn trống" theo tỉ lệ còn trống: hết bàn→đỏ, ≤25%→cam, còn nhiều→xanh, chưa có bàn→xám.
const tableTagType = (b) => {
  const avail = Number(b.available_tables ?? 0);
  const total = Number(b.total_tables ?? 0);
  if (total === 0) return "info";
  if (avail === 0) return "danger";
  if (avail / total <= 0.25) return "warning";
  return "success";
};

// Khi hiện khối: xin vị trí (độ chính xác cao) rồi tải chi nhánh gần; lỗi → chuyển sang "denied".
onMounted(async () => {
  phase.value = "locating";
  try {
    const pos = await getUserPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
    await fetchNearby(pos.lat, pos.lng);
  } catch (e) {
    errorMsg.value = e.message || "Không lấy được vị trí";
    phase.value = "denied";
  }
});
</script>

<style scoped>
.home-nearby {
  max-width: var(--hl-content-max, 1100px);
  margin: 0 auto;
  padding: var(--hl-space-2xl) var(--hl-space-md);
  text-align: left;
}

.home-nearby__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--hl-space-lg);
  margin-bottom: var(--hl-space-lg);
}

.home-nearby .section-title {
  font-family: var(--hl-font-display);
  text-align: left;
  margin-bottom: var(--hl-space-sm);
  color: var(--hl-secondary);
  font-weight: 700;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
}

.home-nearby .section-title::after {
  margin-left: 0;
  margin-right: auto;
}

.home-nearby__desc {
  color: var(--hl-text-muted);
  font-size: 0.95rem;
  margin: 0;
  max-width: 480px;
}

.home-nearby__state {
  display: flex;
  align-items: center;
  gap: var(--hl-space-sm);
  padding: var(--hl-space-lg);
  background: var(--hl-bg-card);
  border-radius: var(--hl-radius-md);
  margin-bottom: var(--hl-space-md);
}

.home-nearby__state--muted {
  flex-direction: column;
  align-items: flex-start;
}

.home-nearby__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--hl-space-lg);
}

.home-nearby__card {
  position: relative;
  display: block;
  padding: var(--hl-space-lg);
  text-decoration: none;
  color: inherit;
  border: 1px solid var(--hl-border-light);
  border-radius: var(--hl-radius-lg);
  transition: box-shadow 0.25s ease, transform 0.25s ease, border-color 0.2s ease;
  background: var(--hl-bg-card);
}

.home-nearby__card:hover {
  transform: translateY(-5px);
  box-shadow: var(--hl-shadow-lg);
  border-color: var(--hl-primary-light);
}

.home-nearby__badge {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  background: var(--hl-primary);
  color: #fff;
  padding: 4px 8px;
  border-radius: var(--hl-radius-sm);
}

.home-nearby__card h3 {
  color: var(--hl-primary);
  margin: 0 0 var(--hl-space-xs);
  padding-right: 72px;
}

.home-nearby__km {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--hl-primary);
  margin: 0 0 var(--hl-space-sm);
}

.home-nearby__addr {
  font-size: 0.88rem;
  color: var(--hl-text-muted);
  margin: 0 0 var(--hl-space-sm);
  line-height: 1.5;
}

.home-nearby__catalog {
  margin-top: var(--hl-space-lg);
  font-size: 0.9rem;
  color: var(--hl-text-muted);
}

.home-nearby__catalog a {
  color: var(--hl-primary);
  font-weight: 500;
}
</style>
