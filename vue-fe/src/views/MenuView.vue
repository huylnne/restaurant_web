<template>
  <div class="menu-page">
    <h1>Thực Đơn Nhà Hàng</h1>
    <div v-if="menuItems.length">
      <div v-for="item in menuItems" :key="item.item_id" class="menu-card">
        <h2>{{ item.name }}</h2>
        <p>{{ item.description }}</p>
        <p><strong>Giá:</strong> {{ formatPrice(item.price) }}₫</p>
        <p><em>Danh mục:</em> {{ item.category }}</p>
      </div>
    </div>
    <div v-else>
      <p>Đang tải thực đơn...</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';

export default {
  setup() {
    const menuItems = ref([]);

    const fetchMenu = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/menu');
        menuItems.value = response.data;
      } catch (error) {
        console.error('Lỗi khi fetch menu:', error);
      }
    };

    const formatPrice = (price) => {
      return new Intl.NumberFormat('vi-VN').format(price);
    };

    onMounted(() => {
      fetchMenu();
    });

    return {
      menuItems,
      formatPrice
    };
  }
};
</script>

<style scoped>
.menu-page {
  padding: 20px;
}
.menu-card {
  border: 1px solid #ddd;
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 8px;
}
</style>
