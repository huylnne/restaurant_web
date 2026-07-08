<template>
  <el-dialog
    v-model="showReceptionDialog"
    title="Tiếp nhận khách"
    width="700px"
    destroy-on-close
    @open="onReceptionDialogOpen"
  >
    <!-- 2 tab: đón khách có đặt trước (tìm + check-in) và khách vãng lai (chọn bàn trống) -->
    <el-tabs v-model="receptionTab" @tab-change="onReceptionTabChange">
      <el-tab-pane label="Có đặt trước" name="reservation">
        <p class="reception-hint">
          SĐT lấy từ tài khoản khách (không có email). Đang xem chi nhánh
          <strong>#{{ selectedBranchId }}</strong> — phải trùng chi nhánh khi khách đặt bàn.
          Nhập SĐT / tên / mã <strong>#123</strong> rồi bấm Tìm.
        </p>
        <div class="reception-search">
          <el-input
            v-model="receptionSearchQuery"
            placeholder="SĐT / tên khách / mã đặt bàn (#123)"
            :prefix-icon="Search"
            clearable
            @keyup.enter="searchReception"
          />
          <el-button type="primary" :loading="receptionSearchLoading" @click="searchReception">
            Tìm
          </el-button>
        </div>
        <div v-loading="receptionSearchLoading" class="reception-results">
          <p
            v-if="!receptionSearchLoading && !receptionResults.length"
            class="text-muted"
          >
            {{
              receptionSearched
                ? "Không tìm thấy đặt bàn phù hợp."
                : "Chưa có đặt bàn trong khung giờ hôm nay. Thử tìm theo SĐT (vd: 0999888777, 0359167823)."
            }}
          </p>
          <div
            v-for="item in receptionResults"
            :key="item.order_id"
            class="reception-result-card"
          >
            <div class="reception-result-main">
              <strong>#{{ item.order_id }}</strong>
              <span class="guest-name">{{ item.guest?.full_name || "—" }}</span>
              <span class="guest-phone">
                SĐT: <strong>{{ item.guest?.phone || "—" }}</strong>
              </span>
            </div>
            <div class="reception-result-meta">
              <span>
                {{ formatReceptionTables(item) }} · {{ item.number_of_guests }} khách
                <el-tag v-if="item.multiTable" size="small" type="info" class="ml-1">Bàn liền kề</el-tag>
              </span>
              <span>{{ formatReceptionTime(item.arrival_time) }}</span>
              <el-tag v-if="hasReceptionPreOrder(item)" type="info" size="small">
                Đã đặt món trước
              </el-tag>
              <el-tag :type="isReceptionCheckedIn(item) ? 'success' : 'warning'" size="small">
                {{ isReceptionCheckedIn(item) ? "Đã vào bàn" : "Chờ tiếp nhận" }}
              </el-tag>
            </div>
            <el-button
              v-if="canConfirmReception(item)"
              type="primary"
              size="small"
              :loading="receptionConfirmLoading === item.order_id"
              @click="confirmReception(item)"
            >
              Xác nhận tiếp nhận
            </el-button>
            <el-button
              v-else-if="isReceptionCheckedIn(item)"
              size="small"
              @click="openTableAfterReception(item.table)"
            >
              Xem bàn
            </el-button>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="Khách vãng lai" name="walkin">
        <el-form label-width="100px" class="walkin-form">
          <el-form-item label="Số khách">
            <el-input-number
              v-model="walkInGuests"
              :min="1"
              :max="MAX_GUESTS"
              @change="fetchWalkInTables"
            />
          </el-form-item>
        </el-form>
        <div v-loading="walkInTablesLoading" class="walkin-tables">
          <p v-if="!walkInTablesLoading && !walkInTables.length" class="text-muted">
            Không có bàn trống phù hợp.
          </p>
          <div
            v-for="t in walkInTables"
            :key="t.table_id"
            class="walkin-table-chip"
            :class="{ selected: isWalkInTableSelected(t.table_id) }"
            @click="toggleWalkInTable(t.table_id)"
          >
            <strong>B{{ t.table_number }}</strong>
            <span>{{ t.capacity }} chỗ</span>
          </div>
        </div>
        <p class="walkin-selection-summary">
          Đã chọn {{ walkInSelectedTableIds.length }} bàn · {{ walkInSelectedCapacity }} /
          {{ walkInGuests || 0 }} chỗ
        </p>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="showReceptionDialog = false">Đóng</el-button>
      <el-button
        v-if="receptionTab === 'walkin'"
        type="primary"
        :disabled="!hasEnoughWalkInCapacity"
        :loading="walkInSubmitLoading"
        @click="submitWalkIn"
      >
        Xếp bàn
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
// ReceptionDialog — dialog tiếp nhận khách gồm 2 tab: "Có đặt trước" (tìm + check-in) và "Khách vãng lai" (ghép bàn trống).
// Toàn bộ state/hàm lấy từ context chung của trang bàn.
import { Search } from "@element-plus/icons-vue";
import { useTablesContext } from "../composables/tablesContext";

const {
  showReceptionDialog,
  receptionTab,
  selectedBranchId,
  receptionSearchQuery,
  receptionResults,
  receptionSearchLoading,
  receptionSearched,
  receptionConfirmLoading,
  walkInGuests,
  MAX_GUESTS,
  walkInTables,
  walkInTablesLoading,
  walkInSelectedTableIds,
  walkInSelectedCapacity,
  hasEnoughWalkInCapacity,
  walkInSubmitLoading,
  onReceptionDialogOpen,
  onReceptionTabChange,
  formatReceptionTables,
  formatReceptionTime,
  hasReceptionPreOrder,
  isReceptionCheckedIn,
  canConfirmReception,
  searchReception,
  confirmReception,
  openTableAfterReception,
  fetchWalkInTables,
  isWalkInTableSelected,
  toggleWalkInTable,
  submitWalkIn,
} = useTablesContext();
</script>
