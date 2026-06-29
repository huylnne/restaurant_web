<script setup>
import MenuPageContent from "@/features/menu/components/MenuPageContent.vue";

defineProps({
  mode: {
    type: String,
    default: "public",
    validator: (v) => ["public", "admin"].includes(v),
  },
});
</script>

<template>
  <MenuPageContent :mode="mode" />
</template>
