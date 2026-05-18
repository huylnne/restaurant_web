<template>
  <div class="static-page">
    <StaticPageHero
      eyebrow="HL Food"
      title="Giới thiệu"
      :subtitle="intro.subtitle"
      image="/images/homeimg1.png"
    >
      <template #actions>
        <router-link to="/booking">
          <el-button type="warning" size="large">Đặt bàn ngay</el-button>
        </router-link>
        <router-link to="/menu">
          <el-button size="large" plain class="hero-btn-light">Xem thực đơn</el-button>
        </router-link>
      </template>
    </StaticPageHero>

    <div class="static-page__container">
      <section class="hl-card static-block">
        <h2 class="hl-title-primary">{{ intro.title }}</h2>
        <p class="static-lead">{{ intro.content }}</p>
        <p class="static-lead">
          {{ BRAND.tagline }} Chúng tôi kết hợp ẩm thực truyền thống với hệ thống quản lý hiện đại —
          từ đặt bàn, gọi món, phối hợp bếp đến báo cáo doanh thu theo chi nhánh.
        </p>
      </section>

      <section class="static-block">
        <h2 class="section-heading">Giá trị cốt lõi</h2>
        <div class="value-grid">
          <div v-for="item in ABOUT_VALUES" :key="item.title" class="value-card hl-card">
            <el-icon class="value-card__icon" :size="32">
              <component :is="item.icon" />
            </el-icon>
            <h3>{{ item.title }}</h3>
            <p>{{ item.desc }}</p>
          </div>
        </div>
      </section>

      <section class="static-block">
        <h2 class="section-heading">Hành trình phát triển</h2>
        <el-timeline>
          <el-timeline-item
            v-for="m in ABOUT_MILESTONES"
            :key="m.year"
            :timestamp="m.year"
            placement="top"
            color="var(--hl-primary)"
          >
            {{ m.text }}
          </el-timeline-item>
        </el-timeline>
      </section>

      <section v-if="branches.length" class="static-block">
        <h2 class="section-heading">Hệ thống chi nhánh</h2>
        <div class="branch-grid">
          <el-card
            v-for="b in branches"
            :key="b.branch_id"
            shadow="hover"
            class="branch-card"
            :body-style="{ padding: 0 }"
          >
            <div class="branch-card__img" :style="branchImageStyle(b)" />
            <div class="branch-card__body">
              <h3>{{ b.name }}</h3>
              <p><el-icon><Location /></el-icon> {{ b.address }}</p>
              <p v-if="b.phone"><el-icon><Phone /></el-icon> {{ b.phone }}</p>
              <p v-if="b.open_time">
                <el-icon><Clock /></el-icon>
                {{ b.open_time }} – {{ b.close_time || "22:00" }}
              </p>
              <el-tag v-if="b.available_tables != null" type="success" size="small">
                {{ b.available_tables }} / {{ b.total_tables }} bàn trống
              </el-tag>
            </div>
          </el-card>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import { Location, Phone, Clock } from "@element-plus/icons-vue";
import StaticPageHero from "@/components/StaticPageHero.vue";
import { BRAND, ABOUT_VALUES, ABOUT_MILESTONES } from "@/config/siteContent";

const branches = ref([]);
const intro = ref({
  title: `${BRAND.name} – Nơi hương vị quê hương thăng hoa`,
  subtitle: BRAND.tagline,
  content:
    "Với kinh nghiệm phục vụ ẩm thực Việt, HL Food cam kết mang đến không gian ấm cúng và món ăn chất lượng cho mọi dịp sum họp.",
});

const branchImageStyle = (b) => ({
  backgroundImage: `url(${b.image_url || "/images/homeimg2.png"})`,
});

onMounted(async () => {
  try {
    const [introRes, branchRes] = await Promise.all([
      axios.get("/api/home/introduction"),
      axios.get("/api/home/branches"),
    ]);
    if (introRes.data?.title) intro.value.title = introRes.data.title;
    if (introRes.data?.content) {
      intro.value.content = introRes.data.content;
      intro.value.subtitle =
        introRes.data.content.length > 120
          ? introRes.data.content.slice(0, 120) + "..."
          : introRes.data.content;
    }
    const list = Array.isArray(branchRes.data) ? branchRes.data : [];
    branches.value = list.filter((b) => b.is_active !== false);
  } catch (e) {
    console.error("About page load error:", e);
  }
});
</script>

<style scoped>
@import "@/assets/static-pages.css";
</style>
