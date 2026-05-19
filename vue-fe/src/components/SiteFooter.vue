<template>
  <footer v-if="!hideOnAdmin" class="site-footer">
    <div class="site-footer__inner">
      <div class="site-footer__brand">
        <img :src="BRAND.logo" :alt="BRAND.name" class="site-footer__logo" />
        <p>{{ BRAND.tagline }}</p>
        <p class="site-footer__contact">
          <a :href="`tel:${BRAND.hotline}`">{{ BRAND.hotline }}</a>
          ·
          <a :href="`mailto:${BRAND.email}`">{{ BRAND.email }}</a>
        </p>
      </div>

      <div class="site-footer__links">
        <h4>Khám phá</h4>
        <router-link to="/menu">Thực đơn</router-link>
        <router-link to="/branches/nearby" class="site-footer__highlight">Chi nhánh gần bạn</router-link>
        <router-link to="/branches">Danh sách chi nhánh</router-link>
        <router-link to="/booking">Đặt bàn</router-link>
        <router-link to="/sale">Khuyến mãi</router-link>
      </div>

      <div class="site-footer__links">
        <h4>Thông tin</h4>
        <router-link to="/about">Giới thiệu</router-link>
        <router-link to="/news">Tin tức</router-link>
        <router-link to="/contact">Liên hệ</router-link>
      </div>

      <div class="site-footer__cta">
        <h4>Đến nhà hàng?</h4>
        <p>Chọn chi nhánh gần nhất, xem bàn trống và đặt chỗ trước.</p>
        <router-link to="/branches/nearby">
          <el-button type="warning" :icon="Location">Chi nhánh gần bạn</el-button>
        </router-link>
      </div>
    </div>
    <p class="site-footer__copy">© {{ year }} {{ BRAND.name }}. All rights reserved.</p>
  </footer>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { Location } from "@element-plus/icons-vue";
import { BRAND } from "@/config/siteContent";

const route = useRoute();
const year = new Date().getFullYear();

const hideOnAdmin = computed(() => route.path.startsWith("/admin"));
</script>

<style scoped>
.site-footer {
  margin-top: auto;
  background: var(--hl-primary-dark, #2e4a3d);
  color: rgba(255, 255, 255, 0.9);
  padding: var(--hl-space-2xl) var(--hl-space-md) var(--hl-space-lg);
}

.site-footer__inner {
  max-width: var(--hl-content-max, 1100px);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.2fr repeat(2, 1fr) 1.2fr;
  gap: var(--hl-space-xl);
  align-items: start;
}

.site-footer__logo {
  max-width: 120px;
  height: auto;
  margin-bottom: var(--hl-space-sm);
  filter: brightness(1.1);
}

.site-footer__brand p {
  font-size: 0.9rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.75);
  margin: 0 0 var(--hl-space-sm);
}

.site-footer__contact a {
  color: #fff;
  text-decoration: none;
}

.site-footer__contact a:hover {
  text-decoration: underline;
}

.site-footer__links {
  display: flex;
  flex-direction: column;
  gap: var(--hl-space-sm);
}

.site-footer__links h4,
.site-footer__cta h4 {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 var(--hl-space-sm);
  color: rgba(255, 255, 255, 0.95);
}

.site-footer__links a {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-size: 0.9rem;
}

.site-footer__links a:hover,
.site-footer__highlight {
  color: var(--hl-accent, #f0b429) !important;
}

.site-footer__cta p {
  font-size: 0.88rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.75);
  margin: 0 0 var(--hl-space-md);
}

.site-footer__copy {
  text-align: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin: var(--hl-space-xl) 0 0;
  padding-top: var(--hl-space-lg);
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  max-width: var(--hl-content-max, 1100px);
  margin-left: auto;
  margin-right: auto;
}

@media (max-width: 900px) {
  .site-footer__inner {
    grid-template-columns: 1fr 1fr;
  }

  .site-footer__brand,
  .site-footer__cta {
    grid-column: 1 / -1;
  }
}

@media (max-width: 520px) {
  .site-footer__inner {
    grid-template-columns: 1fr;
  }
}
</style>
