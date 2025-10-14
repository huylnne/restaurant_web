<template>
  <div class="dashboard">
    <h2>Tổng quan</h2>
    <div class="stats">
      <div class="stat-card">
        <div class="icon-box green">
          <el-icon><Money /></el-icon>
        </div>
        <div class="text">
          <h3>Doanh thu hôm nay</h3>
          <p class="value">68,500,000đ</p>
          <p class="growth">+15.2%</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="icon-box orange">
          <el-icon><TrendCharts /></el-icon>
        </div>
        <div class="text">
          <h3>Số đơn hàng</h3>
          <p class="value">156</p>
          <p class="growth">+12.8%</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="icon-box purple">
          <el-icon><User /></el-icon>
        </div>
        <div class="text">
          <h3>Khách hàng</h3>
          <p class="value">245</p>
          <p class="growth">+8.5%</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="icon-box orange">
          <el-icon><KnifeFork /></el-icon>
        </div>
        <div class="text">
          <h3>Món ăn bán ra</h3>
          <p class="value">428</p>
          <p class="growth">+18.3%</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Money, TrendCharts, User, KnifeFork } from "@element-plus/icons-vue";
</script>

<style scoped>
.dashboard {
  padding: 20px 30px;
  width: 100%;
  box-sizing: border-box;
}

h2 {
  margin-bottom: 20px;
  color: #78350f;
  font-weight: 600;
}

.stats {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 20px;
  width: 100%;
}

.stat-card {
  flex: 1 1 0;
  background: #fff;
  border: 1px solid #f1e3d3;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  transition: 0.3s;
  box-sizing: border-box;
}

.stat-card:hover {
  transform: translateY(-4px);
  cursor: pointer;
}

.icon-box {
  width: 45px;
  height: 45px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.icon-box.green {
  background-color: #22c55e;
}

.icon-box.orange {
  background-color: #f97316;
}

.icon-box.purple {
  background-color: #a855f7;
}

.text {
  display: flex;
  flex: 1;
  justify-content: center;
  flex-direction: column;
  align-items: center;
}

.text h3 {
  font-size: 20px;
  font-weight: 500;
  color: #333;
}

.value {
  font-size: 18px;
  font-weight: 600;
  color: #111;
  margin: 4px 0;
}

.growth {
  color: #16a34a;
  font-weight: 500;
  font-size: 14px;
}

/* Responsive (tablet, mobile) */
@media (max-width: 1024px) {
  .stats {
    flex-wrap: wrap;
  }

  .stat-card {
    flex: 1 1 calc(50% - 20px);
  }
}

@media (max-width: 600px) {
  .stat-card {
    flex: 1 1 100%;
  }
}
</style>
