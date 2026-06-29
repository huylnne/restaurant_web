<template>
  <el-select
    :model-value="modelValue"
    placeholder="Chọn chi nhánh"
    class="admin-branch-select"
    :disabled="disabled"
    @update:model-value="$emit('update:modelValue', $event)"
    @change="$emit('change', $event)"
  >
    <el-option
      v-for="branch in branches"
      :key="branch.branch_id"
      :label="branch.name"
      :value="branch.branch_id"
    />
  </el-select>
</template>

<script setup>
defineProps({
  modelValue: { type: [Number, String], required: true },
  branches: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
});

defineEmits(["update:modelValue", "change"]);
</script>

<style scoped>
.admin-branch-select {
  width: 220px;
  max-width: 100%;
}
</style>
