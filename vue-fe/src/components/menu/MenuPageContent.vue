<script setup>
// Wrapper tương thích đường dẫn cũ: component thật nằm ở features/menu; chỉ chuyển tiếp prop mode.
import MenuPageContent from "@/features/menu/components/MenuPageContent.vue";

defineProps({
  mode: {
    type: String,
    default: "public",
    validator: (v) => ["public", "admin"].includes(v), // chỉ nhận "public" hoặc "admin"
  },
});
</script>

<template>
  <MenuPageContent :mode="mode" />
</template>
