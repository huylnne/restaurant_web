<template>
  <div class="static-page">
    <StaticPageHero
      eyebrow="Tin tức"
      title="Tin tức & Sự kiện"
      subtitle="Cập nhật thực đơn, mở rộng chi nhánh và các tính năng mới trên hệ thống HL Food."
      image="/images/homeimg3.png"
    />

    <div class="static-page__container">
      <div class="news-grid">
        <article
          v-for="article in NEWS_ARTICLES"
          :key="article.id"
          class="news-card"
          @click="openArticle(article)"
        >
          <div class="news-card__img" :style="{ backgroundImage: `url(${article.image})` }" />
          <div class="news-card__body">
            <span class="news-card__category">{{ article.category }}</span>
            <h3>{{ article.title }}</h3>
            <p class="news-card__excerpt">{{ article.excerpt }}</p>
            <time class="news-card__date">{{ formatDate(article.date) }}</time>
          </div>
        </article>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="selected?.title" width="640px" destroy-on-close>
      <template v-if="selected">
        <img :src="selected.image" :alt="selected.title" class="news-detail__img" />
        <el-tag size="small" type="info">{{ selected.category }}</el-tag>
        <time class="news-card__date">{{ formatDate(selected.date) }}</time>
        <p class="news-detail__body">{{ selected.body }}</p>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from "vue";
import StaticPageHero from "@/components/StaticPageHero.vue";
import { NEWS_ARTICLES } from "@/config/siteContent";

const dialogVisible = ref(false);
const selected = ref(null);

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const openArticle = (article) => {
  selected.value = article;
  dialogVisible.value = true;
};
</script>

<style scoped>
@import "@/assets/static-pages.css";
</style>
