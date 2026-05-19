<template>
  <div class="static-page">
    <StaticPageHero
      eyebrow="Ưu đãi"
      title="Khuyến mãi"
      :subtitle="`Chương trình ưu đãi tại ${BRAND.name} — áp dụng theo từng chi nhánh và thời gian. Vui lòng đặt bàn trước để được giữ chỗ.`"
      image="/images/homeimg2.png"
    />

    <div class="static-page__container">
      <p class="promo-note">
        <strong>Lưu ý:</strong> Không áp dụng đồng thời nhiều ưu đãi trừ khi có thông báo riêng. Chi tiết có thể thay đổi theo từng chi nhánh — nhân viên sẽ xác nhận khi thanh toán.
      </p>

      <div class="promo-grid">
        <article v-for="promo in PROMOTIONS" :key="promo.id" class="promo-card">
          <div class="promo-card__media" :style="{ backgroundImage: `url(${promo.image})` }">
            <el-tag class="promo-card__badge" type="warning" effect="dark">{{ promo.badge }}</el-tag>
            <span class="promo-card__discount">{{ promo.discount }}</span>
          </div>
          <div class="promo-card__body">
            <h3>{{ promo.title }}</h3>
            <p>{{ promo.description }}</p>
            <p class="promo-card__meta">Hiệu lực đến: {{ promo.validUntil }}</p>
            <router-link :to="promo.cta.to">
              <el-button type="primary" style="width: 100%">{{ promo.cta.label }}</el-button>
            </router-link>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup>
import StaticPageHero from "@/components/StaticPageHero.vue";
import { BRAND, PROMOTIONS } from "@/config/siteContent";
</script>

<style scoped>
@import "@/assets/static-pages.css";
</style>
