# Câu hỏi & Trả lời phản biện — Restaurant Web

Tài liệu ôn phản biện đồ án **Hệ thống quản lý nhà hàng đa chi nhánh** (đặt bàn, gọi món, bếp, thanh toán, quản trị).

> Nguồn: phân tích mã nguồn `restaurant_web/` — ưu tiên **nghiệp vụ**.

---

## Mục lục

1. [Tổng quan & bài toán](#i-tổng-quan--bài-toán)
2. [Đặt bàn (UC05)](#ii-đặt-bàn-uc05)
3. [Trạng thái bàn & tiếp nhận (UC10)](#iii-trạng-thái-bàn--tiếp-nhận-uc10)
4. [Gọi món & bếp (UC08)](#iv-gọi-món--bếp-uc08)
5. [Thanh toán](#v-thanh-toán)
6. [Đánh giá (UC13)](#vi-đánh-giá-uc13)
7. [Báo cáo & quản trị](#vii-báo-cáo--quản-trị)
8. [Bảo mật & ràng buộc](#viii-bảo-mật--ràng-buộc-nghiệp-vụ)
9. [Thiết kế dữ liệu & kiến trúc](#ix-thiết-kế-dữ-liệu--kiến-trúc)
10. [Sơ đồ luồng nghiệp vụ](#x-sơ-đồ-luồng-nghiệp-vụ)
11. [Câu bẫy thường gặp](#xi-câu-bẫy-thường-gặp)

---

## I. Tổng quan & bài toán

### H1. Đồ án giải quyết bài toán gì?

**Đ:** Hệ thống quản lý nhà hàng **đa chi nhánh**, phủ toàn bộ vòng đời phục vụ: khách xem menu → đặt bàn / walk-in → check-in → gọi món → bếp chế biến (realtime) → thanh toán → đánh giá; đồng thời quản trị thực đơn, nhân sự, báo cáo doanh thu.

### H2. Vì sao chọn mô hình đa chi nhánh thay vì một nhà hàng đơn lẻ?

**Đ:** Mỗi chi nhánh có thực đơn, bàn, nhân viên và giờ mở cửa riêng. Admin xem toàn hệ thống; manager / waiter / kitchen chỉ thao tác trong phạm vi `branch_id` được gán — phản ánh chuỗi nhà hàng thực tế.

### H3. Có bao nhiêu vai trò? Phân quyền thế nào?

**Đ:** 5 vai trò trong `users.role`:

| Vai trò   | Nghiệp vụ chính                                              |
|-----------|--------------------------------------------------------------|
| `user`    | Đặt bàn, gọi món, thanh toán, đánh giá                       |
| `waiter`  | Quản lý bàn, check-in, gọi món, xác nhận thanh toán          |
| `kitchen` | Hàng đợi bếp, cập nhật trạng thái món                        |
| `manager` | Chi nhánh của mình, menu, báo cáo, đánh giá                  |
| `admin`   | Toàn hệ thống: chi nhánh, nhân sự, tài khoản khách, nhật ký  |

Backend dùng JWT + middleware `authorizeRole`; menu sidebar FE lọc theo `roles` trong `sidebarMenu.js`.

---

## II. Đặt bàn (UC05)

### H4. Luồng đặt bàn của khách diễn ra thế nào?

**Đ:**

1. Khách đăng nhập → chọn chi nhánh, ngày/giờ, số khách.
2. Hệ thống validate giờ mở cửa chi nhánh.
3. Tự động **gán bàn** phù hợp (một bàn hoặc ghép nhiều bàn liền kề).
4. Tạo `Order` với `order_type = "reservation"`, `status = pending`.
5. (Tùy chọn) đặt món trước → tạo `OrderItem`.
6. Nhân viên thấy trên màn **Tiếp nhận / Quản lý bàn**.

### H5. “Buffer 2 giờ” khi đặt bàn nghĩa là gì?

**Đ:** Mỗi đặt bàn giữ bàn trong **2 giờ** kể từ `arrival_time` (`RESERVATION_BUFFER_MS = 2h`). Trong khung này bàn không được gán cho đặt bàn khác. `expected_end_time = arrival_time + 2h`. Nếu giờ đặt quá gần giờ đóng cửa (không đủ 2h buffer), hệ thống từ chối — logic trong `shared/branchHours.js` (`RESERVATION_HOLD_MINUTES = 120`).

### H6. Hệ thống chọn bàn như thế nào khi số khách lớn?

**Đ:** Thuật toán trong `be/utils/tableAllocation.js`:

- Ưu tiên **một bàn đủ chỗ** (capacity nhỏ nhất vừa đủ).
- Nếu không có → **ghép các bàn liền kề** (số bàn chênh ≤ 1, sliding window).
- Chọn phương án ít bàn nhất, ít chỗ thừa nhất, span ngắn nhất.
- Nhiều bàn được lưu qua bảng `order_tables`; ghi chú order có dạng `(Nhóm X khách — ghép bàn liền kề: B1, B2)`.

### H7. Khách được đặt tối đa bao nhiêu lượt trong tương lai?

**Đ:** Tối đa **2** đặt bàn tương lai đang `pending` hoặc `confirmed` (`FUTURE_ACTIVE_LIMIT = 2`) — tránh spam đặt bàn.

### H8. Số khách tối đa mỗi lần đặt?

**Đ:** `MAX_GUESTS = 20` (`be/config/restaurantRules.js`). Mỗi bàn mặc định capacity 6 chỗ (`TABLE_CAPACITY = 6`).

### H9. Khách hủy đặt bàn khi nào được?

**Đ:** Chỉ khi `status` thuộc `pending` hoặc `confirmed` (`CANCELABLE_RESERVATION_STATUSES`). Nếu thuộc nhóm `booking_group_id` thì hủy cả nhóm.

### H10. Xử lý race condition khi hai khách cùng đặt một slot?

**Đ:** `createReservation` chạy trong **transaction** với `SELECT ... FOR UPDATE` trên bàn; sau khi chọn bàn kiểm tra lại overlap; nếu trùng thì thử bàn khác (`pickAvailableTableWithLock`).

---

## III. Trạng thái bàn & tiếp nhận (UC10)

### H11. Có mấy trạng thái bàn? Ý nghĩa từng trạng thái?

**Đ:** 4 trạng thái (`shared/tableStatus.js`):

| Trạng thái     | Ý nghĩa                              |
|----------------|--------------------------------------|
| `available`    | Trống, có thể đặt / xếp khách        |
| `pre-ordered`  | Đã có đặt bàn sắp đến (≤ 15 phút)    |
| `occupied`     | Đang phục vụ                         |
| `cleaning`     | Chờ dọn sau thanh toán               |

### H12. Bàn chuyển sang `pre-ordered` khi nào?

**Đ:** Job `expireReservationsForBranch` (chạy mỗi ~60s và trước nhiều thao tác): khi còn **≤ 15 phút** (`PRE_ORDER_MINUTES`) đến `arrival_time` của đặt bàn `pending/confirmed/pre-ordered` chưa check-in.

### H13. No-show xử lý thế nào?

**Đ:** Quá **15 phút** (`OVERDUE_MINUTES`) sau `arrival_time` mà chưa `checked_in_at`:

- Order → `no_show`
- Tài khoản khách (`role = user`) → `locked = true`
- Bàn được giải phóng

### H14. Check-in đặt bàn khác walk-in thế nào?

**Đ:**

- **Đặt bàn:** `confirmArrival` — nhân viên xác nhận khách đến; set `checked_in_at`, bàn → `occupied`, status có thể `pre-ordered`.
- **Walk-in:** `walkInCheckIn` — nhân viên chọn bàn trống, nhập số khách; tạo order phiên tại chỗ, không cần đặt trước. Kiểm tra capacity, bàn không bị đặt trước trong tương lai.

### H15. Một khách có thể theo dõi bàn đang ngồi ở đâu?

**Đ:** Trang **Bàn của tôi** (`/my-table`) hoặc quét **QR bàn** (`/t/:token` với `qr_token` trên bảng `tables`). `billService.findActiveOrderByUser` tìm order active của user.

---

## IV. Gọi món & bếp (UC08)

### H16. Trạng thái đơn hàng (order) có những gì?

**Đ:** 8 trạng thái (`shared/orderStatus.js`):

`pending` → `confirmed` → `pre-ordered` → `in_progress` → `waiting_payment` → `completed` / `cancelled` / `no_show`

### H17. Trạng thái từng món (order_item) và pipeline bếp?

**Đ:** `pending` → `processing` → `done` → `served`:

- **Bếp:** `pending` → `processing` → `done`
- **Phục vụ:** `done` → `served` (đã giao khách)

### H18. Khi bếp bắt đầu làm món, trạng thái đơn có đổi không?

**Đ:** Có. `syncOrderStatusFromItems`: nếu có món `processing` và order đang `pending/confirmed/pre-ordered` → chuyển `in_progress`.

### H19. Realtime giữa bếp và phục vụ hoạt động ra sao?

**Đ:** WebSocket `ws://.../ws/realtime` theo `branch_id` (`be/realtimeHub.js`). Khi bếp cập nhật món hoặc thanh toán xong, server `notifyBranch` — FE phục vụ/bếp refresh hàng đợi, toast món xong (UC08).

### H20. Ai được gọi món?

**Đ:** Cả **khách** (My Table / QR) và **nhân viên phục vụ** (dialog tạo order trên màn quản lý bàn). Món gắn `order_id` của phiên bàn đang active.

### H21. Giá món tính thế nào trên hóa đơn?

**Đ:** `bill.service.js`: ưu tiên `sale_price` nếu có; lưu `price` tại thời điểm order (`order_items.price`) để giá không đổi khi menu cập nhật sau.

---

## V. Thanh toán

### H22. Luồng thanh toán end-to-end?

**Đ:**

1. Khách bấm **yêu cầu thanh toán** → order `waiting_payment`.
2. Nhân viên xác nhận trên hệ thống (tiền mặt, chuyển khoản, thẻ, ví…) hoặc khách thanh toán online.
3. `payment.status = succeeded` → order `completed`, `payment_status = succeeded`.
4. Bàn → `cleaning`; phát realtime `payment_succeeded`.
5. Xuất hóa đơn PDF (`invoice.service`).

### H23. Hỗ trợ những phương thức thanh toán nào?

**Đ:** `CASH`, `BANK_TRANSFER`, `CARD`, `WALLET`, `MOMO`, `SEPAY` (VietQR), `COD` (map về tiền mặt). Offline: nhân viên xác nhận; online: MoMo redirect + IPN webhook, SePay/VietQR + webhook khớp số tiền và mã đơn.

### H24. VietQR/SePay khớp đơn hàng thế nào?

**Đ:** Mã chuyển khoản dạng `DH{orderId}` (`buildSePayOrderCode`). Webhook parse nội dung, so khớp `transferAmount` với tổng bill; idempotent qua `transaction_ref` — tránh ghi nhận trùng.

### H25. Thanh toán xong bàn có tự giải phóng không?

**Đ:** Không về `available` ngay — chuyển `cleaning`. Nhân viên đánh dấu dọn xong mới `available` (tránh khách mới ngồi khi bàn chưa dọn).

### H26. Ghép nhiều bàn thì thanh toán một lần hay nhiều lần?

**Đ:** Một phiên billing chính (`resolvePrimaryBillingOrder`); `onPaymentSucceededByOrder` cập nhật tất cả order trong `booking_group` và tất cả `table_id` liên quan.

---

## VI. Đánh giá (UC13)

### H27. Khách đánh giá khi nào?

**Đ:** Sau khi order `completed` hoặc `payment_status = succeeded`. Mỗi order **một review** duy nhất. Rating 1–5, comment 5–1000 ký tự.

### H28. Đánh giá qua QR bàn có được không?

**Đ:** Có — trong cửa sổ **4 giờ** (`REVIEW_WINDOW_MS`) sau phiên tại bàn đó (`findRecentReviewableOrderForTable`).

### H29. Manager/Admin quản lý đánh giá làm gì?

**Đ:** Xem danh sách theo chi nhánh, lọc, theo dõi phản hồi khách — phục vụ cải thiện dịch vụ.

---

## VII. Báo cáo & quản trị

### H30. Báo cáo doanh thu tính trên cơ sở nào?

**Đ:** Tổng `quantity × price` của `order_items` thuộc order `completed`, lọc theo `branch_id` và khoảng ngày. Có thống kê đơn hoàn tất, đang phục vụ, số đặt bàn, khách distinct, món bán chạy; xuất Excel/PDF.

### H31. Dashboard và màn quản lý bàn có số liệu khác nhau không?

**Đ:** Không — cùng gọi `tableSummary.service.js` (UC10) để đồng bộ: tổng bàn, đang phục vụ, chờ dọn, đã đặt trước.

### H32. Nhật ký thao tác (operation log) ghi gì?

**Đ:** User, role, branch, action, module, IP, request body (đã redact password/token). Admin tra cứu audit các thao tác nhạy cảm.

### H33. Menu mỗi chi nhánh có khác nhau không?

**Đ:** Có — `menu_items.branch_id`. Manager quản lý menu chi nhánh mình; admin xem tất cả. Có `sale_price`, ảnh upload `be/uploads/`, trạng thái còn/bán.

---

## VIII. Bảo mật & ràng buộc nghiệp vụ

### H34. Chống spam đăng ký tài khoản?

**Đ:** CAPTCHA tự sinh (SVG, TTL 10 phút) + rate limit. Component `CaptchaField.vue` trên form register.

### H35. Tài khoản bị khóa khi nào?

**Đ:** No-show (tự động), admin khóa thủ công (`locked = true`). User locked không tạo đặt bàn mới.

### H36. Nhân viên bếp có sửa món chi nhánh khác không?

**Đ:** Không — `kitchen.service` kiểm tra `branch_id` của món phải khớp chi nhánh đang đăng nhập.

### H37. Validate SĐT và mật khẩu thế nào?

**Đ:** SĐT VN 10 số, bắt đầu 0, unique. Password hash bcrypt (60 ký tự). JWT bắt buộc `JWT_SECRET` ≥ 16 ký tự.

---

## IX. Thiết kế dữ liệu & kiến trúc

### H38. Vì sao gộp “đặt bàn” và “phiên phục vụ” vào một bảng `orders`?

**Đ:** Một thực thể **phiên tại nhà hàng** xuyên suốt lifecycle: phân biệt bằng `order_type` (`reservation` vs walk-in/dine-in). Tránh duplicate logic thanh toán, order_items, review. `reservation_id` alias cũ vẫn map `order_id`.

### H39. `shared/` dùng để làm gì?

**Đ:** Single source of truth cho constants nghiệp vụ (`orderStatus`, `tableStatus`, `branchHours`) — FE và BE cùng import, tránh lệch trạng thái giữa client và server.

### H40. Vì sao dùng PostgreSQL + Sequelize?

**Đ:** Cần transaction (đặt bàn, thanh toán), query báo cáo phức tạp (aggregate doanh thu, no-show batch SQL), quan hệ nhiều bảng (`order_tables`, `order_items`). Sequelize ORM + raw SQL khi cần hiệu năng.

### H41. Điểm khác biệt / đóng góp so với POS đơn giản?

**Đ:**

- Đặt bàn online + **tự phân bàn** (ghép bàn liền kề).
- **Đa chi nhánh** với phân quyền theo chi nhánh.
- **Realtime bếp–phục vụ** qua WebSocket.
- Khách tự phục vụ qua **QR bàn** (gọi món, bill, thanh toán VietQR).
- Tự động **no-show** + khóa tài khoản.
- Tích hợp **MoMo / VietQR (SePay)**.

### H42. Hạn chế hiện tại của hệ thống?

**Đ:**

- CAPTCHA lưu in-memory — restart server mất challenge (chưa Redis).
- Ghép bàn theo `table_number` liền kề — chưa có sơ đồ tầng/khu thực tế.
- No-show khóa vĩnh viễn — chưa có quy trình mở khóa tự động / cảnh báo trước.
- Chưa có inventory/nguyên liệu, payroll, loyalty.
- `DB_SYNC_ALTER` chỉ dev — production cần migration riêng.

---

## X. Sơ đồ luồng nghiệp vụ

```
Khách đặt bàn / Walk-in
        ↓
Nhân viên check-in → bàn OCCUPIED
        ↓
Gọi món → order_items PENDING
        ↓
Bếp: PROCESSING → DONE  (WebSocket UC08)
        ↓
Phục vụ: SERVED
        ↓
Yêu cầu thanh toán → WAITING_PAYMENT
        ↓
Xác nhận thanh toán → COMPLETED → bàn CLEANING
        ↓
Đánh giá (UC13, trong 4h)
```

### Công nghệ (tham khảo nhanh)

| Thành phần | Công nghệ |
|------------|-----------|
| Frontend   | Vue 3, Vite, Element Plus, Vue Router, Axios |
| Backend    | Node.js, Express 5, Sequelize |
| Database   | PostgreSQL |
| Realtime   | WebSocket (`/ws/realtime`) |

---

## XI. Câu bẫy thường gặp

| Câu hỏi | Trả lời gọn |
|---------|-------------|
| Khách đặt 19h, đến 19h14 có được không? | Được — no-show sau **15 phút** (19h15). |
| Đặt 21h30, nhà hàng đóng 22h? | Bị từ chối — không đủ buffer 2h trước giờ đóng. |
| Hai nhóm cùng 8 khách, mỗi bàn 4 chỗ liền kề? | Ghép 2 bàn liền kề nếu cùng cluster và không conflict slot 2h. |
| Walk-in có cần tài khoản? | Không bắt buộc — nhân viên tạo phiên; khách có account thì link `user_id`. |
| Hủy đặt bàn sau khi check-in? | Không còn `cancelable` — phải xử lý qua kết thúc phiên / hủy nội bộ. |
| Doanh thu tính order `cancelled`? | Không — chỉ `completed`. |

---

## Tài khoản demo (ôn thao tác)

| Username | Vai trò | Ghi chú |
|----------|---------|---------|
| `admin` | Admin | Toàn hệ thống |
| `manager1` | Quản lý | Chi nhánh 1 |
| `waiter1` | Phục vụ | Chi nhánh 1 |
| `kitchen1` | Bếp | Chi nhánh 1 |
| `ngochuy` | Khách | Chi nhánh 1 |

Mật khẩu demo: `123456`

---

*Tài liệu tạo tự động từ phân tích codebase — cập nhật khi có thay đổi nghiệp vụ.*
