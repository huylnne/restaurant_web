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
// AdminBranchSelect — dropdown chọn chi nhánh dùng lại ở nhiều trang admin.
// Component "câm": danh sách chi nhánh do cha truyền vào, hỗ trợ v-model + sự kiện change.
defineProps({
  modelValue: { type: [Number, String], required: true }, // branch_id đang chọn (v-model)
  branches: { type: Array, default: () => [] },            // danh sách chi nhánh để hiển thị
  disabled: { type: Boolean, default: false },             // khóa chọn (vd admin thường bị khóa chi nhánh)
});

defineEmits(["update:modelValue", "change"]);
</script>

<style scoped>
.admin-branch-select {
  width: 220px;
  max-width: 100%;
}
</style>
