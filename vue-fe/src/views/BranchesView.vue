<template>
  <div class="static-page">
    <StaticPageHero
      :eyebrow="BRAND.name"
      title="Hệ thống chi nhánh"
      subtitle="Danh sách đầy đủ — địa chỉ, liên hệ, giờ mở cửa và bàn trống"
      image="/images/homeimg2.png"
    >
      <template #actions>
        <router-link to="/branches/nearby">
          <el-button type="primary" size="large">Chi nhánh gần bạn</el-button>
        </router-link>
        <router-link to="/booking">
          <el-button type="warning" size="large">Đặt bàn ngay</el-button>
        </router-link>
      </template>
    </StaticPageHero>

    <div class="static-page__container">
      <el-skeleton v-if="loading" :rows="6" animated />

      <el-empty v-else-if="!branches.length" description="Chưa có chi nhánh đang hoạt động" />

      <template v-else>
        <section class="hl-card branches-summary static-block">
          <p class="static-lead">
            Hiện có <strong>{{ branches.length }}</strong> chi nhánh đang phục vụ.
            Tổng cộng <strong>{{ totalAvailableTables }}</strong> bàn trống
            trên <strong>{{ totalTables }}</strong> bàn trong hệ thống.
          </p>
        </section>

        <section class="static-block">
          <div class="branch-grid">
            <el-card
              v-for="b in branches"
              :id="`branch-${b.branch_id}`"
              :key="b.branch_id"
              shadow="hover"
              class="branch-card"
              :body-style="{ padding: 0 }"
            >
              <div class="branch-card__img" :style="branchImageStyle(b)" />
              <div class="branch-card__body">
                <h3>{{ b.name }}</h3>
                <p>
                  <el-icon><Location /></el-icon>
                  {{ b.address }}
                </p>
                <p v-if="b.phone">
                  <el-icon><Phone /></el-icon>
                  <a :href="`tel:${b.phone}`">{{ b.phone }}</a>
                </p>
                <p v-if="b.open_time">
                  <el-icon><Clock /></el-icon>
                  {{ formatHours(b) }}
                </p>
                <div class="branch-card__tables">
                  <el-tag :type="tableTagType(b)" size="small">
                    {{ b.available_tables ?? 0 }} / {{ b.total_tables ?? 0 }} bàn trống
                  </el-tag>
                  <span v-if="b.total_tables != null" class="branch-card__tables-hint">
                    {{ tableStatusText(b) }}
                  </span>
                </div>
                <div class="branch-card__actions">
                  <router-link :to="{ path: '/booking', query: { branch_id: b.branch_id } }">
                    <el-button type="primary" size="small">Đặt bàn tại đây</el-button>
                  </router-link>
                  <router-link :to="{ path: '/menu', query: { branch_id: b.branch_id } }">
                    <el-button size="small" plain>Thực đơn</el-button>
                  </router-link>
                </div>
              </div>
            </el-card>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import axios from "axios";
import { Location, Phone, Clock } from "@element-plus/icons-vue";
import StaticPageHero from "@/components/StaticPageHero.vue";
import { BRAND } from "@/config/siteContent";
import { apiUrl } from "@/config/api";

const branches = ref([]);
const loading = ref(true);

const totalTables = computed(() =>
  branches.value.reduce((sum, b) => sum + Number(b.total_tables || 0), 0)
);

const totalAvailableTables = computed(() =>
  branches.value.reduce((sum, b) => sum + Number(b.available_tables || 0), 0)
);

const branchImageStyle = (b) => {
  let url = b.image_url || "/images/homeimg2.png";
  if (url.startsWith("/uploads")) {
    url = apiUrl(url);
  }
  return { backgroundImage: `url(${url})` };
};

const formatHours = (b) => {
  const open = b.open_time || "08:00";
  const close = b.close_time || "22:00";
  return `Mở cửa ${open} – ${close}`;
};

const tableTagType = (b) => {
  const avail = Number(b.available_tables ?? 0);
  const total = Number(b.total_tables ?? 0);
  if (total === 0) return "info";
  if (avail === 0) return "danger";
  if (avail / total <= 0.25) return "warning";
  return "success";
};

const tableStatusText = (b) => {
  const avail = Number(b.available_tables ?? 0);
  const total = Number(b.total_tables ?? 0);
  if (total === 0) return "Chưa có bàn trong hệ thống";
  if (avail === 0) return "Hiện không còn bàn trống";
  if (avail / total <= 0.25) return "Sắp hết bàn trống";
  return "Còn nhiều bàn trống";
};

onMounted(async () => {
  try {
    const res = await axios.get("/api/home/branches");
    const list = Array.isArray(res.data) ? res.data : [];
    branches.value = list.filter((b) => b.is_active !== false);
  } catch (e) {
    console.error("Branches page load error:", e);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
@import "@/assets/static-pages.css";

.branches-summary {
  padding: var(--hl-space-xl);
  text-align: center;
}

.branch-card__tables {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--hl-space-sm);
  margin-top: var(--hl-space-sm);
}

.branch-card__tables-hint {
  font-size: 0.8rem;
  color: var(--hl-text-muted);
}

.branch-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--hl-space-sm);
  margin-top: var(--hl-space-md);
}

.branch-card__body a {
  color: inherit;
  text-decoration: none;
}

.branch-card__body a:hover {
  color: var(--hl-primary);
}
</style>
