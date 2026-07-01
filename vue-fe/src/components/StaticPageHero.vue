<template>
  <section class="static-hero" :style="heroStyle">
    <div class="static-hero__inner">
      <p v-if="eyebrow" class="static-hero__eyebrow">{{ eyebrow }}</p>
      <h1 class="static-hero__title">{{ title }}</h1>
      <p v-if="subtitle" class="static-hero__subtitle">{{ subtitle }}</p>
      <div v-if="$slots.actions" class="static-hero__actions">
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  eyebrow: { type: String, default: "" },
  image: { type: String, default: "/images/homeimg1.png" },
});

const heroStyle = computed(() => ({
  backgroundImage: `var(--hl-gradient-hero), url(${props.image})`,
}));
</script>

<style scoped>
.static-hero {
  background-size: cover;
  background-position: center;
  border-radius: var(--hl-radius-xl);
  overflow: hidden;
  margin-bottom: var(--hl-space-xl);
  box-shadow: var(--hl-shadow-lg);
  position: relative;
}

.static-hero::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.15) 0%, transparent 40%);
  pointer-events: none;
}

.static-hero__inner {
  max-width: var(--hl-content-max);
  margin: 0 auto;
  padding: var(--hl-space-2xl) var(--hl-space-lg);
  color: #fff;
  position: relative;
  z-index: 1;
}

.static-hero__eyebrow {
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.9;
  margin-bottom: var(--hl-space-sm);
}

.static-hero__title {
  font-family: var(--hl-font-display);
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: var(--hl-space-md);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
}

.static-hero__subtitle {
  font-size: 1.05rem;
  max-width: 640px;
  opacity: 0.95;
  line-height: 1.65;
}

.static-hero__actions {
  margin-top: var(--hl-space-lg);
  display: flex;
  flex-wrap: wrap;
  gap: var(--hl-space-md);
}

.static-hero__actions :deep(.el-button) {
  font-weight: 600;
}
</style>
