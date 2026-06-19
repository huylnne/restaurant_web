<template>
  <div class="admin-tables">
    <div class="header">
      <div class="title-section">
        <h2>Quản lý bàn ăn</h2>
        <p>Quản lý và theo dõi tình trạng bàn ăn trong nhà hàng</p>
      </div>
      <div class="header-actions admin-toolbar">
        <el-select
          v-model="selectedBranchId"
          placeholder="Chọn chi nhánh"
          class="branch-select"
          :disabled="userRole !== 'admin'"
          @change="handleBranchChange"
        >
          <el-option
            v-for="branch in branches"
            :key="branch.branch_id"
            :label="branch.name"
            :value="branch.branch_id"
          />
        </el-select>
        <el-button :icon="Refresh" @click="() => { fetchTables(); fetchSummary(); }" title="Làm mới">
          Làm mới
        </el-button>
        <el-button type="success" @click="openReceptionDialog">
          <el-icon><UserFilled /></el-icon>
          Tiếp nhận khách
        </el-button>
        <el-button v-if="userRole === 'admin'" type="warning" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          Đặt bàn mới
        </el-button>
      </div>
    </div>

    <!-- Thống kê tổng quan -->
    <div class="summary-cards">
      <div class="summary-card orange-border">
        <div class="card-content">
          <h3>Tổng số bàn</h3>
          <p class="value">{{ summary.totalTables }} bàn</p>
        </div>
        <div class="card-icon orange">
          <el-icon><Grid /></el-icon>
        </div>
      </div>

      <div class="summary-card green-border">
        <div class="card-content">
          <h3>Bàn trống</h3>
          <p class="value green">{{ summary.availableTables }} bàn</p>
        </div>
        <div class="card-icon green">
          <el-icon><CircleCheck /></el-icon>
        </div>
      </div>

      <div class="summary-card orange-border">
        <div class="card-content">
          <h3>Đang phục vụ</h3>
          <p class="value orange">{{ summary.occupiedTables }} bàn</p>
        </div>
        <div class="card-icon orange">
          <el-icon><Clock /></el-icon>
        </div>
      </div>

      <div class="summary-card reserved-border">
        <div class="card-content">
          <h3>Đã đặt</h3>
          <p class="value reserved">{{ summary.reservedTables }} bàn</p>
        </div>
        <div class="card-icon reserved">
          <el-icon><Calendar /></el-icon>
        </div>
      </div>

      <div class="summary-card cleaning-border">
        <div class="card-content">
          <h3>Chờ dọn</h3>
          <p class="value cleaning">{{ summary.cleaningTables }} bàn</p>
        </div>
        <div class="card-icon cleaning">
          <el-icon><Refresh /></el-icon>
        </div>
      </div>

      <div v-if="userRole !== 'waiter'" class="summary-card yellow-border">
        <div class="card-content">
          <h3>Doanh thu hiện tại</h3>
          <p class="value yellow">{{ formatCurrency(summary.currentRevenue) }}</p>
        </div>
        <div class="card-icon yellow">
          <el-icon><Money /></el-icon>
        </div>
      </div>
    </div>

    <!-- Tìm kiếm và lọc -->
    <div class="filter-section">
      <el-input
        v-model="searchQuery"
        placeholder="Tìm kiếm bàn..."
        :prefix-icon="Search"
        clearable
        @input="filterTables"
      />
      <el-select v-model="filterStatus" placeholder="Tất cả bàn" @change="filterTables">
        <el-option label="Tất cả bàn" value="" />
        <el-option label="Bàn trống" value="available" />
        <el-option label="Đang phục vụ" value="occupied" />
        <el-option label="Đã đặt" value="pre-ordered" />
        <el-option label="Chờ dọn" value="cleaning" />
      </el-select>
    </div>

    <!-- Danh sách bàn (ref để tính số bàn/trang theo kích thước màn) -->
    <div ref="tablesGridRef" class="tables-grid">
      <div
        v-for="table in displayedTables"
        :key="table.table_id"
        :class="['table-card', getStatusClass(table.status)]"
        @click="viewTableDetail(table)"
      >
        <div class="table-header">
          <h3>B{{ table.table_number }}</h3>
          <el-tag :type="getTagType(table.status)">{{
            getStatusText(table.status)
          }}</el-tag>
        </div>

        <div class="table-info">
          <p class="capacity">{{ table.capacity }} chỗ</p>

          <!-- Bàn đang phục vụ / đã đặt trước → hiện info order -->
          <div v-if="table.activeOrder" class="reservation-info">
            <p class="guests">
              <el-icon><User /></el-icon>
              {{ table.activeOrder.number_of_guests }} khách
            </p>
            <p class="time">
              <el-icon><Clock /></el-icon>
              {{ formatTime(table.activeOrder.arrival_time) }}
            </p>
            <p class="revenue">{{ formatCurrency(table.totalRevenue) }}</p>
          </div>

          <!-- Bàn Trống nhưng có đặt trước tương lai → cảnh báo nhân viên -->
          <div v-else-if="table.upcomingOrder" class="upcoming-reservation-info">
            <p class="status-ready-text">Sẵn sàng phục vụ</p>
            <p class="upcoming-badge">
              <el-icon><Clock /></el-icon>
              Đặt trước lúc {{ formatTime(table.upcomingOrder.arrival_time) }}
              · {{ table.upcomingOrder.number_of_guests }} khách
            </p>
          </div>

          <!-- Trống hoàn toàn -->
          <div v-else class="empty-info">
            <p
              :class="{
                'status-ready-text': normalizeTableStatus(table.status) === 'available',
                'status-reserved-text': normalizeTableStatus(table.status) === 'pre-ordered',
                'status-occupied-text': normalizeTableStatus(table.status) === 'occupied',
                'status-cleaning-text': normalizeTableStatus(table.status) === 'cleaning',
              }"
            >
              {{
                normalizeTableStatus(table.status) === 'cleaning'
                  ? 'Cần dọn bàn'
                  : normalizeTableStatus(table.status) === 'available'
                  ? 'Sẵn sàng phục vụ'
                  : normalizeTableStatus(table.status) === 'pre-ordered'
                    ? 'Đã đặt'
                    : 'Đang phục vụ'
              }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <PaginationBar
      v-if="tablePaginationTotalPages > 1"
      :current-page="tableCurrentPage"
      :total-pages="tablePaginationTotalPages"
      @update:current-page="tableCurrentPage = $event"
    />

    <!-- Dialog thêm bàn -->
    <el-dialog v-model="showAddDialog" title="Thêm bàn mới" width="500px">
      <el-form :model="newTable" label-width="120px">
        <el-form-item label="Số bàn">
          <el-input
            v-model.number="newTable.table_number"
            type="number"
            placeholder="Nhập số bàn"
          />
        </el-form-item>
        <el-form-item label="Số ghế">
          <el-input
            v-model.number="newTable.capacity"
            type="number"
            placeholder="Nhập số ghế"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">Hủy</el-button>
        <el-button type="primary" @click="addTable">Thêm bàn</el-button>
      </template>
    </el-dialog>

    <!-- Dialog chi tiết bàn -->
    <el-dialog v-model="showDetailDialog" title="Chi tiết bàn" width="700px" @open="onDetailDialogOpen">
      <div v-if="selectedTable" class="table-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Số bàn"
            >B{{ selectedTable.table_number }}</el-descriptions-item
          >
          <el-descriptions-item label="Số ghế"
            >{{ selectedTable.capacity }} chỗ</el-descriptions-item
          >
          <el-descriptions-item label="Trạng thái">
            <el-tag :type="getTagType(selectedTable.status)">{{
              getStatusText(selectedTable.status)
            }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Doanh thu">{{
            formatCurrency(selectedTable.totalRevenue)
          }}</el-descriptions-item>
          <el-descriptions-item label="QR">
            <div class="qr-token-row">
              <el-tag type="info" size="small">{{ selectedTable.qr_token || "—" }}</el-tag>
              <el-button
                v-if="selectedTable.qr_token"
                size="small"
                @click="openQrDialog(selectedTable)"
              >
                Xem QR
              </el-button>
              <el-button
                v-if="selectedTable.qr_token"
                size="small"
                type="primary"
                @click="openPaymentQrDialog(selectedTable)"
              >
                QR thanh toán
              </el-button>
            </div>
          </el-descriptions-item>
        </el-descriptions>

        <!-- Cảnh báo: bàn Trống nhưng có đặt trước tương lai -->
        <div v-if="selectedTable?.upcomingOrder && normalizeTableStatus(selectedTable?.status) === 'available'"
             class="orders-section upcoming-section">
          <div class="orders-section-header">
            <h4>⏰ Đặt trước sắp tới</h4>
            <el-tag type="warning" size="small">Chưa tới giờ</el-tag>
          </div>
          <div class="upcoming-detail">
            <p>
              <strong>Giờ đặt:</strong>
              {{ new Date(selectedTable.upcomingOrder.arrival_time).toLocaleString('vi-VN') }}
            </p>
            <p>
              <strong>Số khách:</strong>
              {{ selectedTable.upcomingOrder.number_of_guests }} người
            </p>
            <p class="upcoming-note">
              Bàn này có đặt trước, không nên xếp khách vãng lai vào trong khoảng thời gian trên.
            </p>
          </div>
          <!-- Pre-order items nếu có -->
          <div v-if="preOrders.length" style="margin-top:10px">
            <p style="font-size:13px;color:var(--hl-text-muted);margin-bottom:6px">Món đặt trước:</p>
            <div v-for="order in preOrders" :key="order.order_id" class="order-block">
              <div class="order-meta">Đơn #{{ order.order_id }} · Đặt trước</div>
              <div v-for="oi in order.OrderItems || []" :key="oi.order_item_id" class="order-item-row">
                <span>{{ oi.MenuItem?.name }} x {{ oi.quantity }}</span>
                <el-tag type="info" size="small">Chưa chế biến</el-tag>
              </div>
            </div>
          </div>
        </div>

        <!-- Đơn hàng của bàn (phiên hiện tại - không bao gồm pre-order) -->
        <div class="orders-section">
          <div class="orders-section-header">
            <h4>Đơn hàng hiện tại</h4>
            <el-button type="primary" size="small" @click="openCreateOrderDialog">
              <el-icon><Plus /></el-icon>
              Tạo đơn
            </el-button>
          </div>
          <div v-loading="tableOrdersLoading" class="orders-list">
            <template v-if="tableOrders.length === 0 && !tableOrdersLoading">
              <p class="text-muted">Chưa có đơn nào trong phiên này.</p>
            </template>
            <template v-else>
              <div v-for="order in tableOrders" :key="order.order_id" class="order-block">
                <div class="order-meta">
                  Đơn #{{ order.order_id }}
                  <el-tag
                    v-if="isLegacyPreorderOrderStatus(order.status)"
                    type="info"
                    size="small"
                    style="margin-left: 6px"
                  >
                    Đặt món trước
                  </el-tag>
                  <el-tag
                    v-else-if="normalizeOrderStatus(order.status) === 'in_progress'"
                    type="warning"
                    size="small"
                    style="margin-left: 6px"
                  >
                    {{ getOrderStatusLabel(order.status) }}
                  </el-tag>
                </div>
                <div
                  v-for="oi in order.OrderItems || []"
                  :key="oi.order_item_id"
                  class="order-item-row"
                >
                  <span>{{ oi.MenuItem?.name }} x {{ oi.quantity }}</span>
                  <div class="order-item-actions">
                    <el-tag v-if="oi.status === 'served'" type="success" size="small">Đã phục vụ</el-tag>
                    <template v-else>
                      <el-tag
                        v-if="oi.status === 'done'"
                        type="warning"
                        size="small"
                      >
                        Bếp đã xong
                      </el-tag>
                      <el-button
                        type="primary"
                        size="small"
                        link
                        @click="markItemServed(oi.order_item_id)"
                      >
                        Đánh dấu đã phục vụ
                      </el-button>
                    </template>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Hóa đơn tạm tính (đồng bộ với phía user) -->
        <div class="orders-section" v-if="tableBill">
          <div class="orders-section-header">
            <h4>Hóa đơn tạm tính</h4>
          </div>
          <div v-loading="tableBillLoading" class="orders-list">
            <template v-if="!tableBill?.items?.length && !tableBillLoading">
              <p class="text-muted">Chưa có món nào để tính tiền.</p>
            </template>
            <template v-else>
              <div
                v-for="item in tableBill.items"
                :key="item.item_id"
                class="order-item-row"
              >
                <span>{{ item.name }} x {{ item.quantity }}</span>
                <span>{{ formatCurrency(item.line_total) }}</span>
              </div>
              <div class="order-summary">
                <div class="order-summary__row">
                  <span>Tổng cộng</span>
                  <strong>{{ formatCurrency(tableBill.total_amount) }}</strong>
                </div>
              </div>
            </template>
          </div>
        </div>

        <div class="orders-section" v-if="tableBill">
          <div class="orders-section-header">
            <h4>Thanh toán &amp; hóa đơn</h4>
          </div>
          <div class="orders-list">
            <div class="payment-status" v-if="paymentInfo">
              <el-tag
                :type="paymentInfo.status === 'succeeded' ? 'success' : 'warning'"
                size="small"
              >
                {{ paymentInfo.status === 'succeeded' ? 'Đã thanh toán' : 'Chờ thanh toán' }}
              </el-tag>
              <span class="muted" v-if="paymentInfo.invoice_no">
                Mã HĐ: {{ paymentInfo.invoice_no }}
              </span>
              <span class="muted" v-if="paymentInfo.paid_at">
                • {{ formatDateTime(paymentInfo.paid_at) }}
              </span>
            </div>

            <el-form label-position="top" class="payment-form">
              <el-form-item label="Phương thức thanh toán">
                <el-select v-model="paymentMethod" placeholder="Chọn phương thức">
                  <el-option
                    v-for="opt in paymentMethodOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="Mã giao dịch (nếu có)">
                <el-input
                  v-model="paymentTransactionRef"
                  placeholder="Ví dụ: ngân hàng / ví / POS"
                />
              </el-form-item>
            </el-form>

            <div class="payment-actions">
              <el-button
                type="primary"
                :loading="paymentSubmitting"
                :disabled="!tableBill?.items?.length"
                @click="finalizePayment"
              >
                Xác nhận thanh toán
              </el-button>
              <el-button
                :disabled="!paymentInfo || paymentInfo.status !== 'succeeded'"
                @click="downloadInvoice"
              >
                Tải hóa đơn PDF
              </el-button>
              <el-button
                v-if="paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'SEPAY'"
                @click="openPaymentQrDialog(selectedTable)"
              >
                QR chuyển khoản
              </el-button>
            </div>
          </div>
        </div>

        <div class="actions">
          <el-button @click="showEditDialog">Sửa</el-button>
          <el-button v-if="userRole === 'admin'" type="danger" @click="deleteTable(selectedTable)">Xóa</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- Dialog QR -->
    <el-dialog v-model="showQrDialog" :title="qrMode === 'payment' ? 'QR thanh toán' : 'QR cho bàn'" width="420px">
      <div v-if="qrSelectedTable" class="qr-dialog">
        <div class="qr-title">
          <strong>B{{ qrSelectedTable.table_number }}</strong>
        </div>
        <div class="qr-image-wrap">
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR code" class="qr-image" />
          <div v-else class="text-muted">Đang tạo QR...</div>
        </div>
        <div v-if="qrMode === 'payment'" class="qr-payment-meta">
          <div class="label">Số tiền</div>
          <div class="value">{{ formatCurrency(qrPaymentAmount) }}</div>
          <div class="label">Nội dung CK</div>
          <div class="value code">{{ qrPaymentCode || "Đang tạo..." }}</div>
          <el-tag
            v-if="qrPaymentStatus"
            :type="qrPaymentStatus === 'succeeded' ? 'success' : 'warning'"
            size="small"
          >
            {{ qrPaymentStatus === 'succeeded' ? 'Đã thanh toán' : 'Đang chờ SEPay xác nhận' }}
          </el-tag>
        </div>
        <div v-else class="qr-link">
          <div class="label">Link scan</div>
          <el-input :model-value="qrLink" readonly />
        </div>
      </div>
      <template #footer>
        <el-button v-if="qrMode !== 'payment'" @click="copyQrLink" :disabled="!qrLink">Copy link</el-button>
        <el-button type="primary" @click="showQrDialog = false">Đóng</el-button>
      </template>
    </el-dialog>

    <!-- Dialog tạo đơn (chọn món) -->
    <el-dialog v-model="showCreateOrderDialog" title="Tạo đơn hàng" width="560px">
      <div v-loading="menuItemsLoading" class="create-order-form">
        <p v-if="selectedTable" class="table-info">Bàn B{{ selectedTable?.table_number }}</p>
        <el-scrollbar max-height="320px">
          <div class="menu-list">
            <div v-for="item in menuItemsForOrder" :key="item.item_id" class="menu-row">
              <span class="menu-name">{{ item.name }}</span>
              <el-input-number
                v-model="orderQuantities[item.item_id]"
                :min="0"
                :max="20"
                size="small"
                style="width: 120px"
              />
            </div>
          </div>
        </el-scrollbar>
        <p v-if="!hasOrderItemsSelected" class="hint">Chọn ít nhất một món với số lượng > 0</p>
      </div>
      <template #footer>
        <el-button @click="showCreateOrderDialog = false">Hủy</el-button>
        <el-button type="primary" :disabled="!hasOrderItemsSelected" @click="submitCreateOrder">
          Tạo đơn
        </el-button>
      </template>
    </el-dialog>

    <!-- UC06: Tiếp nhận khách -->
    <el-dialog
      v-model="showReceptionDialog"
      title="Tiếp nhận khách"
      width="640px"
      destroy-on-close
      @open="onReceptionDialogOpen"
    >
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
                <el-tag :type="item.canCheckIn ? 'warning' : 'success'" size="small">
                  {{ item.canCheckIn ? "Chờ tiếp nhận" : "Đã vào bàn" }}
                </el-tag>
              </div>
              <el-button
                v-if="item.canCheckIn"
                type="primary"
                size="small"
                :loading="receptionConfirmLoading === item.order_id"
                @click="confirmReception(item)"
              >
                Xác nhận tiếp nhận
              </el-button>
              <el-button
                v-else
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
                :max="20"
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
              :class="{ selected: walkInSelectedTableId === t.table_id }"
              @click="walkInSelectedTableId = t.table_id"
            >
              <strong>B{{ t.table_number }}</strong>
              <span>{{ t.capacity }} chỗ</span>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="showReceptionDialog = false">Đóng</el-button>
        <el-button
          v-if="receptionTab === 'walkin'"
          type="primary"
          :disabled="!walkInSelectedTableId"
          :loading="walkInSubmitLoading"
          @click="submitWalkIn"
        >
          Xếp bàn
        </el-button>
      </template>
    </el-dialog>

    <!-- Dialog sửa bàn -->
    <el-dialog v-model="showEditDialogVisible" title="Sửa thông tin bàn" width="500px">
      <el-form :model="editTableForm" label-width="120px">
        <el-form-item label="Số bàn">
          <el-input
            v-model.number="editTableForm.table_number"
            type="number"
            placeholder="Nhập số bàn"
            :disabled="userRole === 'waiter'"
          />
        </el-form-item>
        <el-form-item label="Số ghế">
          <el-input
            v-model.number="editTableForm.capacity"
            type="number"
            placeholder="Nhập số ghế"
            :disabled="userRole === 'waiter'"
          />
        </el-form-item>
        <el-form-item label="Trạng thái">
          <el-select v-model="editTableForm.status" placeholder="Chọn trạng thái">
            <el-option label="Trống" value="available" />
            <el-option label="Đã đặt" value="pre-ordered" />
            <el-option label="Đang phục vụ" value="occupied" />
            <el-option label="Chờ dọn" value="cleaning" />
          </el-select>
        </el-form-item>
        <el-form-item label="QR">
          <div class="qr-token-row">
            <el-tag type="info" size="small">{{ selectedTable?.qr_token || "—" }}</el-tag>
            <el-button
              v-if="selectedTable?.qr_token"
              size="small"
              @click="openQrDialog(selectedTable)"
            >
              Xem QR
            </el-button>
            <el-button
              v-if="selectedTable?.qr_token"
              size="small"
              type="primary"
              @click="openPaymentQrDialog(selectedTable)"
            >
              QR thanh toán
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialogVisible = false">Hủy</el-button>
        <el-button type="primary" @click="updateTable">Cập nhật</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Plus,
  Grid,
  CircleCheck,
  Clock,
  Calendar,
  Money,
  Search,
  User,
  UserFilled,
  Refresh,
} from "@element-plus/icons-vue";
import axios from "axios";
import {
  normalizeTableStatus,
  getTableStatusLabel,
  getTableStatusClass,
  getTableTagType,
} from "@/constants/tableStatus";
import {
  isLegacyPreorderOrderStatus,
  normalizeOrderStatus,
  getOrderStatusLabel,
} from "@/constants/orderStatus";
import PaginationBar from "@/components/PaginationBar.vue";
import QRCode from "qrcode";
import { connectBranchRealtime } from "@/utils/branchRealtime";
import {
  handleKitchenRealtimeMessage,
  notifyKitchenDishDone,
} from "@/utils/kitchenDoneAlert";
import { API_ORIGIN } from "@/config/api";

const API_BASE = API_ORIGIN;
/** Số bàn mỗi trang — cập nhật theo chiều rộng lưới + viewport (tránh 12 bàn trên màn 5 cột) */
const tablesGridRef = ref(null);
const tablePageSize = ref(36);
let tablesGridResizeObserver = null;

function readCssPxVar(name, fallback) {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function computeTablePageSize() {
  const el = tablesGridRef.value;
  if (!el || typeof window === "undefined") return;
  const w = el.clientWidth;
  if (w < 80) return;

  const minCard = readCssPxVar("--hl-admin-grid-min", 220);
  const gap = readCssPxVar("--hl-admin-grid-gap", 16);
  const cols = Math.max(1, Math.floor((w + gap) / (minCard + gap)));

  const rect = el.getBoundingClientRect();
  const reserveBottom = 120;
  const availH = Math.max(240, window.innerHeight - rect.top - reserveBottom);
  const estRowH = 150;
  const rows = Math.max(3, Math.min(14, Math.floor(availH / estRowH)));

  const next = Math.min(150, Math.max(12, cols * rows));
  if (tablePageSize.value !== next) {
    tablePageSize.value = next;
  }
}

function clampTablePage() {
  const total = filteredTables.value?.length || 0;
  const maxPage = Math.max(1, Math.ceil(total / tablePageSize.value));
  if (tableCurrentPage.value > maxPage) {
    tableCurrentPage.value = maxPage;
  }
}

function onTablesGridLayoutTick() {
  computeTablePageSize();
  clampTablePage();
}

const WAITER_API = `${API_BASE}/api/admin/waiter`;
const TABLE_API = `${API_BASE}/api/admin/table`;
const RECEPTION_API = `${API_BASE}/api/admin/reception`;
const BRANCH_API = `${API_BASE}/api/home/branches`;

const userRole = ref("");
const branches = ref([]);
const selectedBranchId = ref(1);
const tables = ref([]);
const filteredTables = ref([]);
const summary = ref({
  totalTables: 0,
  availableTables: 0,
  occupiedTables: 0,
  reservedTables: 0,
  cleaningTables: 0,
  currentRevenue: 0,
});

const searchQuery = ref("");
const filterStatus = ref("");
const tableCurrentPage = ref(1);
const showAddDialog = ref(false);
const showDetailDialog = ref(false);
const showEditDialogVisible = ref(false);
const selectedTable = ref(null);

// QR dialog state
const showQrDialog = ref(false);
const qrSelectedTable = ref(null);
const qrDataUrl = ref("");
const qrLink = ref("");
const qrMode = ref("link"); // 'link' | 'payment'
const qrPaymentAmount = ref(0);
const qrPaymentCode = ref("");
const qrPaymentOrderId = ref(null);
const qrPaymentStatus = ref("");
let qrPaymentPollTimer = null;

// Waiter: đơn hàng theo bàn
const tableOrders = ref([]);
const tableOrdersLoading = ref(false);
const showCreateOrderDialog = ref(false);
const menuItemsForOrder = ref([]);
const menuItemsLoading = ref(false);
const orderQuantities = ref({});

// Bill tạm tính cho bàn (dùng chung với phía user)
const tableBill = ref(null);
const tableBillLoading = ref(false);
const paymentInfo = ref(null);
const paymentLoading = ref(false);
const paymentMethod = ref("CASH");
const paymentTransactionRef = ref("");
const paymentSubmitting = ref(false);

const paymentMethodOptions = [
  { value: "CASH", label: "Tiền mặt" },
  { value: "BANK_TRANSFER", label: "Chuyển khoản" },
  { value: "SEPAY", label: "SEPay" },
  { value: "CARD", label: "Thẻ" },
  { value: "WALLET", label: "Ví điện tử" },
];

const hasOrderItemsSelected = computed(() =>
  Object.values(orderQuantities.value).some((qty) => qty > 0)
);

/** Đơn cũ trong DB còn status pre-ordered — hiển thị badge, không ẩn khỏi danh sách */
const legacyPreOrders = computed(() =>
  tableOrders.value.filter((o) => isLegacyPreorderOrderStatus(o.status))
);
const preOrders = legacyPreOrders;

const newTable = ref({
  table_number: null,
  capacity: null,
});

const editTableForm = ref({
  table_number: null,
  capacity: null,
  status: "",
});

// UC06 – Tiếp nhận khách
const showReceptionDialog = ref(false);
const receptionTab = ref("reservation");
const receptionSearchQuery = ref("");
const receptionResults = ref([]);
const receptionSearchLoading = ref(false);
const receptionSearched = ref(false);
const receptionConfirmLoading = ref(null);
const walkInGuests = ref(2);
const walkInTables = ref([]);
const walkInTablesLoading = ref(false);
const walkInSelectedTableId = ref(null);
const walkInSubmitLoading = ref(false);

const fetchBranches = async () => {
  try {
    const response = await axios.get(BRANCH_API);
    branches.value = Array.isArray(response.data) ? response.data : [];
    if (branches.value.length > 0) {
      const hasSelected = branches.value.some((b) => b.branch_id === selectedBranchId.value);
      if (!hasSelected) selectedBranchId.value = branches.value[0].branch_id;
    }
  } catch (error) {
    console.error("Lỗi lấy danh sách chi nhánh:", error);
    ElMessage.error("Không thể tải danh sách chi nhánh");
  }
};

// Lấy dữ liệu
const fetchTables = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(TABLE_API, {
      params: { branchId: selectedBranchId.value },
      headers: { Authorization: `Bearer ${token}` },
    });
    tables.value = response.data;
    filteredTables.value = response.data;
    await nextTick();
    requestAnimationFrame(() => {
      onTablesGridLayoutTick();
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách bàn:", error);
    ElMessage.error("Không thể lấy danh sách bàn");
  }
};

const fetchSummary = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${TABLE_API}/summary`, {
      params: { branchId: selectedBranchId.value },
      headers: { Authorization: `Bearer ${token}` },
    });
    summary.value = response.data;
  } catch (error) {
    console.error("Lỗi lấy thống kê:", error);
  }
};

// UC08: phát hiện món vừa chuyển sang "done" sau khi refetch đơn (polling / WS đều đi qua đây)
const lastOrderItemStatusById = new Map();
let orderItemStatusSnapshotPrimed = false;

function resetOrderItemStatusSnapshot() {
  lastOrderItemStatusById.clear();
  orderItemStatusSnapshotPrimed = false;
}

function primeOrderItemStatusSnapshot(orders) {
  lastOrderItemStatusById.clear();
  for (const order of orders || []) {
    for (const oi of order.OrderItems || []) {
      const id = oi.order_item_id;
      if (id == null) continue;
      lastOrderItemStatusById.set(id, String(oi.status || "").toLowerCase());
    }
  }
}

function notifyDishJustDoneFromOrders(ordersAfter) {
  for (const order of ordersAfter || []) {
    for (const oi of order.OrderItems || []) {
      const id = oi.order_item_id;
      if (id == null) continue;
      const st = String(oi.status || "").toLowerCase();
      const prev = lastOrderItemStatusById.get(id);
      if (st === "done" && prev && prev !== "done") {
        notifyKitchenDishDone({
          dishName: oi.MenuItem?.name,
          tableNumber: selectedTable.value?.table_number,
          orderItemId: id,
        });
      }
    }
  }
}

// API nhân viên phục vụ: đơn hàng theo bàn
const fetchTableOrders = async (table_id) => {
  if (!table_id) return;
  tableOrdersLoading.value = true;
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${WAITER_API}/orders`, {
      params: { table_id },
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = Array.isArray(res.data) ? res.data : res.data.orders || [];
    if (orderItemStatusSnapshotPrimed) {
      notifyDishJustDoneFromOrders(data);
    }
    tableOrders.value = data;
    primeOrderItemStatusSnapshot(data);
    orderItemStatusSnapshotPrimed = true;
  } catch (err) {
    console.error("Lỗi lấy đơn hàng bàn:", err);
    tableOrders.value = [];
  } finally {
    tableOrdersLoading.value = false;
  }
};

const fetchTableBill = async (table_id) => {
  if (!table_id) return;
  tableBillLoading.value = true;
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${WAITER_API}/tables/${table_id}/bill`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    tableBill.value = res.data || null;
  } catch (err) {
    console.error("Lỗi lấy bill bàn:", err);
    tableBill.value = null;
  } finally {
    tableBillLoading.value = false;
  }
};

const fetchTablePayment = async (table_id) => {
  if (!table_id) return;
  paymentLoading.value = true;
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${WAITER_API}/tables/${table_id}/payment`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.data?.payment) {
      paymentInfo.value = {
        ...res.data.payment,
        order_id: res.data?.order_id ?? res.data.payment.order_id,
      };
    } else {
      paymentInfo.value = null;
    }
    if (paymentInfo.value?.method) {
      paymentMethod.value = paymentInfo.value.method;
    }
  } catch (err) {
    paymentInfo.value = null;
  } finally {
    paymentLoading.value = false;
  }
};

const onDetailDialogOpen = () => {
  resetOrderItemStatusSnapshot();
  if (selectedTable.value?.table_id) {
    fetchTableOrders(selectedTable.value.table_id);
    fetchTableBill(selectedTable.value.table_id);
    fetchTablePayment(selectedTable.value.table_id);
  }
};

const openCreateOrderDialog = async () => {
  menuItemsForOrder.value = [];
  orderQuantities.value = {};
  menuItemsLoading.value = true;
  showCreateOrderDialog.value = true;
  try {
    const res = await axios.get(`${API_BASE}/api/menu-items`, {
      params: { page: 1, limit: 500, branch_id: selectedBranchId.value },
    });
    const items = res.data?.items || res.data || [];
    menuItemsForOrder.value = items;
    items.forEach((item) => {
      orderQuantities.value[item.item_id] = 0;
    });
  } catch (err) {
    console.error("Lỗi lấy thực đơn:", err);
    ElMessage.error("Không thể tải thực đơn");
  } finally {
    menuItemsLoading.value = false;
  }
};

const submitCreateOrder = async () => {
  if (!selectedTable.value?.table_id) return;
  const items = Object.entries(orderQuantities.value)
    .filter(([, qty]) => qty > 0)
    .map(([item_id, quantity]) => ({ item_id: Number(item_id), quantity }));
  if (!items.length) {
    ElMessage.warning("Chọn ít nhất một món");
    return;
  }
  try {
    const token = localStorage.getItem("token");
    await axios.post(
      `${WAITER_API}/orders`,
      { table_id: selectedTable.value.table_id, items },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    ElMessage.success("Tạo đơn thành công");
    showCreateOrderDialog.value = false;
    fetchTableOrders(selectedTable.value.table_id);
    fetchTables();
    fetchSummary();
  } catch (err) {
    ElMessage.error(err.response?.data?.message || "Tạo đơn thất bại");
  }
};

const markItemServed = async (orderItemId) => {
  try {
    const token = localStorage.getItem("token");
    await axios.patch(
      `${WAITER_API}/order-items/${orderItemId}/served`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    ElMessage.success("Đã đánh dấu đã phục vụ");
    if (selectedTable.value?.table_id) {
      fetchTableOrders(selectedTable.value.table_id);
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || "Cập nhật thất bại");
  }
};

// Thêm bàn
const addTable = async () => {
  try {
    const token = localStorage.getItem("token");
    await axios.post(TABLE_API, { ...newTable.value, branch_id: selectedBranchId.value }, {
      params: { branchId: selectedBranchId.value },
      headers: { Authorization: `Bearer ${token}` },
    });
    ElMessage.success("Thêm bàn thành công");
    showAddDialog.value = false;
    newTable.value = { table_number: null, capacity: null };
    fetchTables();
    fetchSummary();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "Lỗi thêm bàn");
  }
};

const showEditDialog = () => {
  if (!selectedTable.value) return;

  editTableForm.value = {
    table_number: selectedTable.value.table_number,
    capacity: selectedTable.value.capacity,
    status: normalizeTableStatus(selectedTable.value.status) || selectedTable.value.status,
  };

  showEditDialogVisible.value = true;
};

// Cập nhật bàn: admin dùng PUT /api/admin/table/:id, waiter dùng PATCH /api/admin/waiter/tables/:id/status
const updateTable = async () => {
  try {
    const token = localStorage.getItem("token");
    const role = userRole.value;

    if (role === "waiter") {
      await axios.patch(
        `${WAITER_API}/tables/${selectedTable.value.table_id}/status`,
        { status: editTableForm.value.status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } else {
      const oldTableNumber = selectedTable.value.table_number;
      await axios.put(
        `${TABLE_API}/${oldTableNumber}`,
        { ...editTableForm.value, branch_id: selectedBranchId.value },
        {
          params: { branchId: selectedBranchId.value },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    }

    ElMessage.success("Cập nhật bàn thành công");
    showEditDialogVisible.value = false;
    showDetailDialog.value = false;
    fetchTables();
    fetchSummary();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || "Lỗi cập nhật bàn");
  }
};

// Xóa bàn
const deleteTable = async (table) => {
  try {
    await ElMessageBox.confirm(
      `Bạn có chắc muốn xóa bàn ${table.table_number}?`,
      "Xác nhận xóa",
      {
        confirmButtonText: "Xóa",
        cancelButtonText: "Hủy",
        type: "warning",
      }
    );

    const token = localStorage.getItem("token");
    await axios.delete(`${TABLE_API}/${table.table_number}`, {
      params: { branchId: selectedBranchId.value },
      headers: { Authorization: `Bearer ${token}` },
    });

    ElMessage.success("Xóa bàn thành công");
    showDetailDialog.value = false;
    fetchTables();
    fetchSummary();
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(error.response?.data?.message || "Lỗi xóa bàn");
    }
  }
};

// Xem chi tiết
const viewTableDetail = (table) => {
  selectedTable.value = table;
  showDetailDialog.value = true;
};

const openQrDialog = async (table) => {
  qrSelectedTable.value = table;
  qrDataUrl.value = "";
  qrMode.value = "link";
  qrPaymentAmount.value = 0;
  qrPaymentCode.value = "";
  qrPaymentOrderId.value = null;
  qrPaymentStatus.value = "";
  stopQrPaymentPolling();
  const origin = window.location.origin.replace(/\/+$/, "");
  qrLink.value = table?.qr_token ? `${origin}/t/${table.qr_token}` : "";
  showQrDialog.value = true;
  if (!qrLink.value) return;
  try {
    qrDataUrl.value = await QRCode.toDataURL(qrLink.value, { margin: 1, width: 260 });
  } catch (e) {
    console.error("QR gen error:", e);
    ElMessage.error("Không thể tạo QR");
  }
};

const stopQrPaymentPolling = () => {
  if (qrPaymentPollTimer) {
    clearInterval(qrPaymentPollTimer);
    qrPaymentPollTimer = null;
  }
};

const pollQrPaymentStatus = async () => {
  if (!qrPaymentOrderId.value) return;
  try {
    const res = await axios.get(`${API_BASE}/api/payments/by-order/${qrPaymentOrderId.value}`);
    qrPaymentStatus.value = res.data?.status || "";
    if (qrPaymentStatus.value === "succeeded") {
      stopQrPaymentPolling();
      ElMessage.success("SEPay đã xác nhận thanh toán");
      if (selectedTable.value?.table_id) {
        fetchTablePayment(selectedTable.value.table_id);
        fetchTableBill(selectedTable.value.table_id);
        fetchTableOrders(selectedTable.value.table_id);
      }
      fetchTables();
      fetchSummary();
    }
  } catch (err) {
    console.error("Poll payment status error:", err);
  }
};

const startQrPaymentPolling = () => {
  stopQrPaymentPolling();
  pollQrPaymentStatus();
  qrPaymentPollTimer = setInterval(pollQrPaymentStatus, 3000);
};

watch(showQrDialog, (visible) => {
  if (!visible) stopQrPaymentPolling();
});

const openPaymentQrDialog = async (table) => {
  qrSelectedTable.value = table;
  qrDataUrl.value = "";
  qrLink.value = "";
  qrMode.value = "payment";
  qrPaymentAmount.value = 0;
  qrPaymentCode.value = "";
  qrPaymentOrderId.value = null;
  qrPaymentStatus.value = "";
  stopQrPaymentPolling();
  showQrDialog.value = true;
  try {
    const res = await axios.post(`${API_BASE}/api/payments/vietqr`, { tableToken: table.qr_token });
    const raw = res.data?.vietqrRaw;
    qrPaymentAmount.value = res.data?.amount || 0;
    qrPaymentCode.value = res.data?.vietqrContent || res.data?.paymentCode || "";
    qrPaymentOrderId.value = res.data?.orderId || null;
    if (!raw) throw new Error("NO_QR");
    qrDataUrl.value = await QRCode.toDataURL(raw, { margin: 1, width: 260 });
    startQrPaymentPolling();
  } catch (e) {
    console.error("Payment QR error:", e);
    ElMessage.error(e.response?.data?.error || "Không thể tạo QR thanh toán");
  }
};

const copyQrLink = async () => {
  try {
    if (!qrLink.value) return;
    await navigator.clipboard.writeText(qrLink.value);
    ElMessage.success("Đã copy link");
  } catch {
    ElMessage.error("Copy thất bại");
  }
};

// Lọc bàn (chuẩn hóa: reserved = pre-ordered)
const filterTables = () => {
  let result = tables.value;

  if (searchQuery.value) {
    result = result.filter((t) => t.table_number.toString().includes(searchQuery.value));
  }

  if (filterStatus.value) {
    result = result.filter(
      (t) => normalizeTableStatus(t.status) === filterStatus.value
    );
  }

  filteredTables.value = result;
  tableCurrentPage.value = 1;
};

const tablePaginationTotalPages = computed(() =>
  Math.max(1, Math.ceil((filteredTables.value?.length || 0) / tablePageSize.value))
);
const displayedTables = computed(() => {
  const list = filteredTables.value || [];
  const size = tablePageSize.value;
  const start = (tableCurrentPage.value - 1) * size;
  return list.slice(start, start + size);
});

// Dùng chung constants/tableStatus
const getStatusClass = getTableStatusClass;
const getTagType = getTableTagType;
const getStatusText = getTableStatusLabel;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount || 0
  );
};

const formatTime = (datetime) => {
  if (!datetime) return "";
  return new Date(datetime).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateTime = (datetime) => {
  if (!datetime) return "";
  return new Date(datetime).toLocaleString("vi-VN");
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const finalizePayment = async () => {
  if (!selectedTable.value?.table_id) return;
  paymentSubmitting.value = true;
  try {
    const token = localStorage.getItem("token");
    const res = await axios.post(
      `${WAITER_API}/tables/${selectedTable.value.table_id}/checkout`,
      {
        method: paymentMethod.value,
        transaction_ref: paymentTransactionRef.value,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    paymentInfo.value = res.data?.payment || null;
    ElMessage.success("Đã xác nhận thanh toán");
    if (selectedTable.value?.table_id) {
      fetchTableBill(selectedTable.value.table_id);
      fetchTableOrders(selectedTable.value.table_id);
    }
    fetchTables();
    fetchSummary();
  } catch (err) {
    ElMessage.error(err.response?.data?.message || "Không thể xác nhận thanh toán");
  } finally {
    paymentSubmitting.value = false;
  }
};

const downloadInvoice = async () => {
  if (!paymentInfo.value?.order_id) {
    ElMessage.warning("Chưa có hóa đơn để tải");
    return;
  }
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(
      `${WAITER_API}/reservations/${paymentInfo.value.order_id}/invoice.pdf`,
      { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" }
    );
    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const invoiceNo = paymentInfo.value.invoice_no || "invoice";
    link.download = `${invoiceNo}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    ElMessage.error(err.response?.data?.message || "Không thể tải hóa đơn");
  }
};

const openReceptionDialog = () => {
  showReceptionDialog.value = true;
};

const onReceptionDialogOpen = () => {
  receptionTab.value = "reservation";
  receptionSearchQuery.value = "";
  receptionResults.value = [];
  receptionSearched.value = false;
  walkInGuests.value = 2;
  walkInSelectedTableId.value = null;
  walkInTables.value = [];
  loadUpcomingArrivals();
};

const onReceptionTabChange = (tabName) => {
  if (tabName === "walkin") fetchWalkInTables();
};

const loadUpcomingArrivals = async () => {
  receptionSearchLoading.value = true;
  try {
    const res = await axios.get(`${RECEPTION_API}/upcoming`, {
      params: { branchId: selectedBranchId.value },
      headers: authHeaders(),
    });
    receptionResults.value = res.data?.results || [];
  } catch (err) {
    console.error("loadUpcomingArrivals:", err);
    receptionResults.value = [];
    ElMessage.error(
      err.response?.data?.message ||
        "Không tải được danh sách đặt bàn. Kiểm tra backend đã chạy và đã restart sau khi cập nhật API."
    );
  } finally {
    receptionSearchLoading.value = false;
  }
};

const formatReceptionTime = (datetime) => {
  if (!datetime) return "";
  return new Date(datetime).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatReceptionTables = (item) => {
  const tables = item?.tables?.length ? item.tables : item?.table ? [item.table] : [];
  if (!tables.length) return "B?";
  return tables
    .map((t) => `B${t.table_number ?? "?"}`)
    .join(", ");
};

const searchReception = async () => {
  const q = receptionSearchQuery.value.trim();
  if (!q) {
    ElMessage.warning("Nhập SĐT, tên hoặc mã đặt bàn");
    return;
  }
  receptionSearchLoading.value = true;
  receptionSearched.value = true;
  try {
    const res = await axios.get(`${RECEPTION_API}/search`, {
      params: { q, branchId: selectedBranchId.value },
      headers: authHeaders(),
    });
    receptionResults.value = res.data?.results || [];
  } catch (err) {
    console.error("searchReception:", err);
    receptionResults.value = [];
    ElMessage.error(err.response?.data?.message || "Không thể tìm đặt bàn");
  } finally {
    receptionSearchLoading.value = false;
  }
};

const confirmReception = async (item) => {
  receptionConfirmLoading.value = item.order_id;
  try {
    const res = await axios.post(
      `${RECEPTION_API}/check-in`,
      { order_id: item.order_id, branch_id: selectedBranchId.value },
      { headers: authHeaders() }
    );
    ElMessage.success(res.data?.message || "Tiếp nhận thành công");
    showReceptionDialog.value = false;
    await fetchTables();
    await fetchSummary();
    const tableNum = res.data?.table?.table_number ?? item.table?.table_number;
    if (tableNum != null) {
      const found = tables.value.find((t) => t.table_number === tableNum);
      if (found) viewTableDetail(found);
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || "Tiếp nhận thất bại");
  } finally {
    receptionConfirmLoading.value = null;
  }
};

const fetchWalkInTables = async () => {
  walkInTablesLoading.value = true;
  walkInSelectedTableId.value = null;
  try {
    const res = await axios.get(`${RECEPTION_API}/walk-in-tables`, {
      params: { branchId: selectedBranchId.value, guests: walkInGuests.value },
      headers: authHeaders(),
    });
    walkInTables.value = res.data?.tables || [];
  } catch (err) {
    console.error("fetchWalkInTables:", err);
    walkInTables.value = [];
    if (receptionTab.value === "walkin") {
      ElMessage.error(err.response?.data?.message || "Không thể tải bàn trống");
    }
  } finally {
    walkInTablesLoading.value = false;
  }
};

const submitWalkIn = async () => {
  if (!walkInSelectedTableId.value) return;
  walkInSubmitLoading.value = true;
  try {
    const res = await axios.post(
      `${RECEPTION_API}/walk-in`,
      {
        table_id: walkInSelectedTableId.value,
        number_of_guests: walkInGuests.value,
        branch_id: selectedBranchId.value,
      },
      { headers: authHeaders() }
    );
    ElMessage.success(res.data?.message || "Xếp bàn thành công");
    showReceptionDialog.value = false;
    await fetchTables();
    await fetchSummary();
    const tableNum = res.data?.table?.table_number;
    if (tableNum != null) {
      const found = tables.value.find((t) => t.table_number === tableNum);
      if (found) viewTableDetail(found);
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.message || "Xếp bàn thất bại");
  } finally {
    walkInSubmitLoading.value = false;
  }
};

const openTableAfterReception = (tableInfo) => {
  if (!tableInfo?.table_number) return;
  const found = tables.value.find((t) => t.table_number === tableInfo.table_number);
  if (found) {
    showReceptionDialog.value = false;
    viewTableDetail(found);
  }
};

const handleBranchChange = () => {
  tableCurrentPage.value = 1;
  filterStatus.value = "";
  searchQuery.value = "";
  selectedTable.value = null;
  showDetailDialog.value = false;
  fetchTables();
  fetchSummary();
};

// UC08 – Đồng bộ realtime: polling ngắn (phục vụ/bếp) + WebSocket
let refreshTimer = null;
let disposeTablesWs = null;

function getTablesPollIntervalMs() {
  const r = userRole.value;
  if (r === "waiter" || r === "kitchen") return 4000;
  return 12000;
}

function pollTablesSyncTick() {
  if (showDetailDialog.value && selectedTable.value?.table_id) {
    fetchTableOrders(selectedTable.value.table_id);
    fetchTableBill(selectedTable.value.table_id);
    fetchTablePayment(selectedTable.value.table_id);
  } else {
    fetchTables();
    fetchSummary();
  }
}

function onTablesRealtimeMsg(msg) {
  if (msg?.type !== "order_item_status" && msg?.type !== "order_flow") return;
  handleKitchenRealtimeMessage(msg);
  pollTablesSyncTick();
}

function stopTablesPollingAndWs() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  if (typeof disposeTablesWs === "function") {
    disposeTablesWs();
    disposeTablesWs = null;
  }
}

function startTablesPollingAndWs() {
  stopTablesPollingAndWs();
  refreshTimer = setInterval(pollTablesSyncTick, getTablesPollIntervalMs());
  disposeTablesWs = connectBranchRealtime(API_BASE, selectedBranchId.value, onTablesRealtimeMsg);
}

watch(selectedBranchId, () => {
  startTablesPollingAndWs();
});

watch(tablePageSize, () => {
  clampTablePage();
});

onMounted(() => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  userRole.value = user?.role || "";
  if (user?.role !== "admin" && user?.branch_id) {
    selectedBranchId.value = Number(user.branch_id) || 1;
  }
  fetchBranches().then(() => {
    fetchTables();
    fetchSummary();
    startTablesPollingAndWs();
  });

  nextTick(() => {
    const el = tablesGridRef.value;
    if (el && typeof ResizeObserver !== "undefined") {
      tablesGridResizeObserver = new ResizeObserver(() => {
        onTablesGridLayoutTick();
      });
      tablesGridResizeObserver.observe(el);
    }
    window.addEventListener("resize", onTablesGridLayoutTick);
    requestAnimationFrame(() => onTablesGridLayoutTick());
  });
});

onUnmounted(() => {
  stopQrPaymentPolling();
  stopTablesPollingAndWs();
  tablesGridResizeObserver?.disconnect();
  tablesGridResizeObserver = null;
  window.removeEventListener("resize", onTablesGridLayoutTick);
});
</script>

<style scoped>
.admin-tables {
  padding: 0;
  background: var(--hl-admin-bg);
  min-height: 0;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--hl-space-lg);
  gap: 12px;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.header-actions .branch-select {
  width: 220px;
  max-width: 100%;
}

.title-section h2 {
  margin: 0 0 var(--hl-space-sm);
  color: var(--hl-primary);
  font-size: 1.75rem;
  font-weight: 700;
}

.title-section p {
  margin: 0;
  color: var(--hl-text-muted);
  font-size: 14px;
}

/* Summary cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--hl-admin-grid-min)), 1fr));
  gap: var(--hl-admin-grid-gap);
  margin-bottom: 24px;
}

.summary-card {
  background: var(--hl-admin-card);
  border-radius: var(--hl-radius-xl);
  padding: var(--hl-space-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--hl-shadow-md);
  border: 1px solid var(--hl-admin-border);
}

.summary-card.orange-border {
  border-color: #fed7aa;
}
.summary-card.green-border {
  border-color: #86efac;
}
.summary-card.yellow-border {
  border-color: #fde047;
}
.summary-card.reserved-border {
  border-color: #93c5fd;
}

.card-content h3 {
  margin: 0 0 var(--hl-space-md);
  font-size: 14px;
  color: var(--hl-text-muted);
  font-weight: 500;
}

.card-content .value {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--hl-text);
}

.value.green {
  color: var(--hl-admin-success);
}
.value.orange {
  color: var(--hl-primary);
}
.value.yellow {
  color: var(--hl-admin-warning);
}
.value.reserved {
  color: #2563eb;
}

.card-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
}

.card-icon.orange {
  background: linear-gradient(135deg, var(--hl-primary), var(--hl-primary-light));
}
.card-icon.green {
  background: linear-gradient(135deg, var(--hl-admin-success), #34d399);
}
.card-icon.yellow {
  background: linear-gradient(135deg, var(--hl-admin-warning), #fbbf24);
}
.card-icon.reserved {
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
}

/* Filter section */
.filter-section {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-section .el-input {
  flex: 1;
  max-width: 400px;
}

.filter-section .el-select {
  width: 200px;
}

/* Tables grid */
.tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--hl-admin-grid-min)), 1fr));
  gap: var(--hl-admin-grid-gap);
  width: 100%;
  max-width: 100%;
  align-content: start;
}

.table-card {
  background: var(--hl-admin-card);
  border-radius: var(--hl-radius-xl);
  padding: var(--hl-space-lg);
  border: 4px solid var(--hl-admin-border);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--hl-shadow-sm);
}

.table-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--hl-shadow-lg);
}

.table-card.status-available {
  border-color: var(--hl-admin-success);
  background: linear-gradient(135deg, var(--hl-success-bg) 0%, #d1fae5 100%);
}

.table-card.status-occupied {
  border-color: var(--hl-primary);
  background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
}

.table-card.status-reserved {
  border-color: var(--hl-admin-warning);
  background: linear-gradient(135deg, #fefce8 0%, #fef08a 100%);
}

.table-card.status-cleaning {
  border-color: #94a3b8;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
}

.summary-card.cleaning-border {
  border-left: 4px solid #64748b;
}

.value.cleaning {
  color: #64748b;
}

.card-icon.cleaning {
  background: #e2e8f0;
  color: #475569;
}

.status-cleaning-text {
  color: #64748b;
  font-weight: 600;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.table-header h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--hl-text);
}

.table-info {
  color: var(--hl-text-muted);
}

.table-info .capacity {
  font-size: 16px;
  margin: 0 0 16px;
  font-weight: 600;
}

.reservation-info p {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
  font-size: 14px;
  color: #475569;
}

.reservation-info .revenue {
  color: var(--hl-admin-success);
  font-weight: 800;
  font-size: 1.125rem;
  margin-top: var(--hl-space-md);
}

.empty-info p {
  margin: 8px 0;
  font-size: 14px;
}

.table-detail .actions {
  margin-top: 24px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.orders-section {
  margin-top: var(--hl-space-lg);
  padding-top: var(--hl-space-md);
  border-top: 1px solid var(--hl-admin-border);
}

.orders-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.orders-section-header h4 {
  margin: 0;
  font-size: 16px;
  color: #1e293b;
}

.orders-list {
  min-height: 60px;
  max-height: 240px;
  overflow-y: auto;
}

.text-muted {
  color: var(--hl-text-muted);
  font-size: 14px;
  margin: 0;
}

.order-block {
  margin-bottom: var(--hl-space-md);
  padding: var(--hl-space-sm);
  background: var(--hl-admin-bg);
  border-radius: var(--hl-radius-md);
  border: 1px solid var(--hl-admin-border);
}

.order-meta {
  font-size: 12px;
  color: var(--hl-text-muted);
  margin-bottom: var(--hl-space-sm);
}

.order-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 14px;
}

.order-item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.create-order-form .table-info {
  margin-bottom: var(--hl-space-md);
  font-weight: 600;
  color: var(--hl-primary);
}

.create-order-form .menu-list {
  padding-right: 8px;
}

.menu-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--hl-space-sm) 0;
  border-bottom: 1px solid var(--hl-admin-border);
}

.menu-row .menu-name {
  flex: 1;
  margin-right: var(--hl-space-md);
}

.create-order-form .hint {
  margin-top: var(--hl-space-md);
  color: var(--hl-text-muted);
  font-size: 13px;
}

.status-ready-text {
  color: var(--hl-admin-success);
  font-weight: 600;
}

.status-occupied-text {
  color: var(--hl-primary);
  font-weight: 600;
}

.status-reserved-text {
  color: var(--hl-admin-warning);
  font-weight: 600;
}

.order-summary {
  margin-top: var(--hl-space-sm);
  padding-top: var(--hl-space-sm);
  border-top: 2px solid var(--hl-admin-border);
}

.order-summary__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--hl-space-xs) 0;
  font-size: 15px;
}

.order-summary__row span {
  color: var(--hl-text-muted);
  font-weight: 500;
}

.order-summary__row strong {
  color: var(--hl-admin-success);
  font-size: 1.1rem;
  font-weight: 700;
}

.payment-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--hl-space-sm);
}

.payment-form {
  margin-top: var(--hl-space-xs);
}

.payment-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: var(--hl-space-sm);
}

.qr-token-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.qr-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.qr-title {
  font-size: 16px;
}
.qr-image-wrap {
  display: flex;
  justify-content: center;
  padding: 12px;
  background: #fff;
  border: 1px solid var(--hl-admin-border);
  border-radius: var(--hl-radius-md);
}
.qr-image {
  width: 260px;
  height: 260px;
  object-fit: contain;
}
.qr-link .label {
  font-size: 12px;
  color: var(--hl-text-muted);
  margin-bottom: 6px;
}

.qr-payment-meta .label {
  font-size: 12px;
  color: var(--hl-text-muted);
  margin-top: 10px;
}
.qr-payment-meta .value {
  font-weight: 800;
  margin-top: 2px;
}
.qr-payment-meta .value.code {
  padding: 6px 8px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: var(--hl-radius-sm);
  letter-spacing: 0.04em;
}
.qr-payment-meta .el-tag {
  margin-top: 10px;
}

/* Badge đặt trước trên card bàn Trống */
.upcoming-reservation-info .upcoming-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 6px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: #b45309;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 6px;
  padding: 4px 8px;
}

/* Section đặt trước trong dialog */
.upcoming-section {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: var(--hl-radius-md);
  padding: var(--hl-space-md);
}

.upcoming-detail p {
  margin: 4px 0;
  font-size: 14px;
}

.upcoming-note {
  margin-top: 8px !important;
  color: #b45309;
  font-style: italic;
  font-size: 13px !important;
}

.reception-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--hl-text-muted);
  line-height: 1.45;
}

.reception-search {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.reception-search .el-input {
  flex: 1;
}

.reception-results {
  min-height: 80px;
  max-height: 320px;
  overflow-y: auto;
}

.reception-result-card {
  border: 1px solid var(--hl-admin-border);
  border-radius: var(--hl-radius-md);
  padding: 12px;
  margin-bottom: 10px;
  background: var(--hl-admin-bg);
}

.reception-result-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
  font-size: 14px;
}

.reception-result-main .guest-phone {
  color: var(--hl-primary);
  font-size: 13px;
}

.reception-result-main .guest-phone strong {
  font-weight: 700;
}

.reception-result-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--hl-text-muted);
}

.walkin-form {
  margin-bottom: 8px;
}

.walkin-tables {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 60px;
  max-height: 280px;
  overflow-y: auto;
}

.walkin-table-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: 12px 16px;
  border: 2px solid var(--hl-admin-border);
  border-radius: var(--hl-radius-md);
  cursor: pointer;
  background: var(--hl-admin-card);
  transition: border-color 0.15s, background 0.15s;
}

.walkin-table-chip:hover {
  border-color: var(--hl-primary);
}

.walkin-table-chip.selected {
  border-color: var(--hl-primary);
  background: #fff7ed;
}

.walkin-table-chip span {
  font-size: 12px;
  color: var(--hl-text-muted);
  margin-top: 4px;
}

@media (max-width: 1200px) {
  .tables-grid {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
  }
}

@media (max-width: 768px) {
  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .header-actions .branch-select,
  .header-actions > * {
    flex: 1 1 100%;
    width: 100%;
  }

  .filter-section .el-input,
  .filter-section .el-select {
    width: 100%;
    max-width: 100%;
  }

  .tables-grid {
    grid-template-columns: 1fr;
  }

  .table-detail .actions {
    flex-direction: column;
  }

  .order-item-row {
    flex-wrap: wrap;
    gap: 6px;
  }

  .qr-image {
    width: min(100%, 220px);
    height: auto;
  }
}
</style>
