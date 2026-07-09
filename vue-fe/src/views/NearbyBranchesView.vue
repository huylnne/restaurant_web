<template>
  <div class="static-page">
    <StaticPageHero
      eyebrow="Vị trí của bạn"
      title="Chi nhánh gần bạn"
      subtitle="Chúng tôi dùng vị trí thiết bị để gợi ý chi nhánh gần nhất — không lưu vị trí lên máy chủ."
      image="/images/homeimg3.png"
    />

    <div class="static-page__container">
      <div v-if="phase === 'idle' || phase === 'locating'" class="nearby-status hl-card">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
        <p>Đang xác định vị trí của bạn...</p>
        <p class="nearby-status__hint">Trình duyệt có thể hỏi quyền truy cập vị trí.</p>
      </div>

      <div v-else-if="phase === 'denied'" class="nearby-status hl-card nearby-status--error">
        <el-icon :size="36"><Warning /></el-icon>
        <p>{{ locationError }}</p>
        <el-button type="primary" @click="requestLocation">Thử lại</el-button>
        <router-link to="/branches" class="nearby-alt-link">Hoặc xem danh sách tất cả chi nhánh</router-link>
      </div>

      <el-skeleton v-else-if="phase === 'loading'" :rows="5" animated />

      <template v-else-if="phase === 'ready'">
        <section v-if="branches.length" class="static-block">
          <div class="nearby-toolbar">
            <p class="static-lead">
              Sắp xếp theo khoảng cách từ vị trí hiện tại của bạn.
            </p>
            <el-button plain :icon="Refresh" @click="requestLocation">Cập nhật vị trí</el-button>
          </div>

          <div class="nearby-list">
            <el-card
              v-for="(b, index) in branches"
              :key="b.branch_id"
              shadow="hover"
              class="nearby-card"
              :class="{ 'nearby-card--closest': index === 0 && b.distance_km != null }"
            >
              <div class="nearby-card__head">
                <div>
                  <el-tag v-if="index === 0 && b.distance_km != null" type="warning" size="small">
                    Gần nhất
                  </el-tag>
                  <h3>{{ b.name }}</h3>
                </div>
                <span v-if="b.distance_km != null" class="nearby-card__distance">
                  {{ formatDistanceKm(b.distance_km) }}
                </span>
                <el-tag v-else type="info" size="small">Chưa có tọa độ</el-tag>
              </div>
              <p class="nearby-card__row">
                <el-icon><Location /></el-icon>
                {{ b.address }}
              </p>
              <p v-if="b.phone" class="nearby-card__row">
                <el-icon><Phone /></el-icon>
                <a :href="`tel:${b.phone}`">{{ b.phone }}</a>
              </p>
              <p v-if="b.open_time" class="nearby-card__row">
                <el-icon><Clock /></el-icon>
                {{ formatBranchHoursDisplayVi(b.open_time, b.close_time) }}
              </p>
              <el-tag :type="tableTagType(b)" size="small">
                {{ b.available_tables ?? 0 }}/{{ b.total_tables ?? 0 }} bàn trống
              </el-tag>
              <div class="nearby-card__actions">
                <router-link :to="{ path: '/booking', query: { branch_id: b.branch_id } }">
                  <el-button type="primary" size="small">Đặt bàn</el-button>
                </router-link>
                <a
                  v-if="b.latitude != null && b.longitude != null"
                  :href="mapsDirectionsUrl(b.latitude, b.longitude, userCoords)"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <el-button size="small" plain>Chỉ đường</el-button>
                </a>
              </div>
            </el-card>
          </div>
        </section>

        <el-empty v-else description="Không có chi nhánh đang hoạt động" />
      </template>

      <p class="nearby-footer-link">
        Cần xem toàn bộ hệ thống?
        <router-link to="/branches">Danh sách chi nhánh →</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import { Location, Phone, Clock, Loading, Warning, Refresh } from "@element-plus/icons-vue";
import StaticPageHero from "@/components/StaticPageHero.vue";
import { getUserPosition, formatDistanceKm, mapsDirectionsUrl } from "@/utils/geo";
import { formatBranchHoursDisplayVi } from "@/utils/branchHours";

const phase = ref("idle");
const branches = ref([]);
const locationError = ref("");
/** Vị trí dùng cho khoảng cách và link Chỉ đường (ĐHBK khi bật cố định) */
const userCoords = ref(null);

const tableTagType = (b) => {
  const avail = Number(b.available_tables ?? 0);
  const total = Number(b.total_tables ?? 0);
  if (total === 0) return "info";
  if (avail === 0) return "danger";
  if (avail / total <= 0.25) return "warning";
  return "success";
};

async function loadNearby(lat, lng) {
  phase.value = "loading";
  const res = await axios.get("/api/home/branches/nearby", {
    params: { lat, lng },
  });
  branches.value = res.data?.branches ?? [];
  phase.value = "ready";
}

async function requestLocation() {
  phase.value = "locating";
  locationError.value = "";
  try {
    const pos = await getUserPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
    userCoords.value = { lat: pos.lat, lng: pos.lng };
    await loadNearby(pos.lat, pos.lng);
  } catch (e) {
    locationError.value = e.message || "Không lấy được vị trí";
    phase.value = "denied";
  }
}

onMounted(() => {
  requestLocation();
});
</script>

<style scoped>
@import "@/assets/static-pages.css";

.nearby-alert {
  margin-bottom: var(--hl-space-lg);
}

.nearby-status {
  text-align: center;
  padding: var(--hl-space-2xl);
  margin-bottom: var(--hl-space-xl);
}

.nearby-status__hint {
  font-size: 0.9rem;
  color: var(--hl-text-muted);
  margin-top: var(--hl-space-sm);
}

.nearby-status--error .el-icon {
  color: var(--el-color-warning);
  margin-bottom: var(--hl-space-md);
}

.nearby-alt-link {
  display: block;
  margin-top: var(--hl-space-md);
  color: var(--hl-primary);
  font-size: 0.9rem;
}

.nearby-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--hl-space-md);
  margin-bottom: var(--hl-space-lg);
}

.nearby-toolbar .static-lead {
  margin: 0;
}

.nearby-list {
  display: flex;
  flex-direction: column;
  gap: var(--hl-space-lg);
}

.nearby-card {
  border-radius: var(--hl-radius-lg);
}

.nearby-card--closest {
  border: 2px solid var(--hl-primary);
}

.nearby-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--hl-space-sm);
  margin-bottom: var(--hl-space-md);
}

.nearby-card__head h3 {
  margin: var(--hl-space-xs) 0 0;
  color: var(--hl-primary);
}

.nearby-card__distance {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--hl-primary);
}

.nearby-card__row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 0.9rem;
  color: var(--hl-text-secondary);
  margin: 0 0 6px;
}

.nearby-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--hl-space-sm);
  margin-top: var(--hl-space-md);
}

.nearby-footer-link {
  text-align: center;
  margin-top: var(--hl-space-2xl);
  color: var(--hl-text-muted);
}

.nearby-footer-link a {
  color: var(--hl-primary);
  font-weight: 500;
}
</style>
