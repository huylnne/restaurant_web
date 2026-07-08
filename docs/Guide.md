# Câu hỏi đọc code Backend — tìm đúng chỗ ngay

> **Cách dùng:** Bị hỏi gì → tra bảng dưới → mở **1 file** → `Ctrl+F` từ khóa → đọc/sửa đúng hàm đó.  
> Chỉ mở thêm file phụ khi thầy hỏi sâu (route, middleware).

**Luồng chung:** `Route → Middleware → Controller → Service → Utils`  
**Quy tắc:** Logic nghiệp vụ nằm ở **Service**. Muốn sửa hành vi → vào Service trước.

---

## Bảng tra nhanh

| Bị hỏi về… | Mở file này | `Ctrl+F` | Hàm / đoạn cần xem |
|---|---|---|---|

| Đăng ký + hash mật khẩu | `be/controllers/user/auth.controller.js` | `register` | dòng 37 `bcrypt.hash` → 39–48 `User.create` |
| CAPTCHA đăng ký | `be/middlewares/verifyCaptcha.js` | `verifyRegisterCaptcha` | middleware trước `auth.controller.register` |
| Chống spam đăng ký | `be/middlewares/rateLimit.js` | `registerLimiter` | dòng 23 `max: 5` / 1 giờ |

| Đặt bàn, ghép bàn, buffer 2h | `be/services/reservation.service.js` | `createReservation` | `expected_end_time`, `pickAvailableTableWithLock` |

| Thuật toán ghép bàn | `be/utils/tableAllocation.js` | `planTableAllocation` | `multi: true` khi ghép nhiều bàn |

| Trùng lịch bàn | `be/utils/orderTableLinks.js` | `hasOverlappingBooking` | kiểm overlap `arrival_time` → `expected_end_time` |

| Check-in khách đặt trước | `be/services/admin/reception.service.js` | `confirmArrival` | `checked_in_at`, bàn → `occupied` |

| No-show tự động | `be/services/admin/tableSummary.service.js` | `expireReservationsForBranch` | `OVERDUE_MINUTES = 15`, khóa `users.locked` |

| Gọi món (phục vụ) | `be/services/admin/waiter.service.js` | `createOrder` | `orderItemFactory` → `order_items` status `pending` |
| Đẩy bếp khi gọi món | `be/controllers/admin/waiter.controller.js` | `createOrder` | dòng ~77 `notifyBranch` reason `waiter_new_order` |
| Bếp đổi trạng thái món | `be/controllers/admin/kitchen.controller.js` | `changeOrderItemStatus` | dòng ~37 `notifyBranch` type `order_item_status` |

| WebSocket đẩy realtime | `be/realtimeHub.js` | `notifyBranch` | broadcast theo `branchId` |

| Thanh toán xong đổi bàn | `be/services/payment.service.js` | `onPaymentSucceededByOrder` | order → `completed`, bàn → `cleaning` |

| Xác nhận thanh toán phục vụ | `be/services/payment.service.js` | `finalizeReservationPayment` | entry khi nhân viên bấm thanh toán |

| Điều kiện được đánh giá | `be/services/review.service.js` | `isOrderReviewable` | chỉ khi `completed` hoặc payment `succeeded` |

| Ghi nhật ký thao tác | `be/middlewares/operationLog.js` | `auditLog` | dòng 34 `res.on('finish')` |
| Phân quyền role | `be/middlewares/auth.js` | `authorizeRole` | dòng 120–121 trả 403 |
| Giới hạn chi nhánh | `be/utils/branchScope.js` | `resolveBranchId` | manager không override sang chi nhánh khác |

---

## 1. Đăng ký có CAPTCHA và chống spam?

**Câu hỏi:** Spam đăng ký chặn ở đâu? CAPTCHA kiểm tra thế nào? Vì sao không lưu mật khẩu gốc?

### Mở ngay

```
be/controllers/user/auth.controller.js  →  Ctrl+F: register
```

**Đọc đoạn này:**
- dòng 24–35: kiểm tra username/SĐT trùng
- dòng 37: `bcrypt.hash(password, 10)` — **mật khẩu hash trước khi lưu**
- dòng 39–48: `User.create` role `user`

**CAPTCHA + rate limit (trước khi vào `register`):** `be/routes/user/auth.routes.js` dòng 28–40 — `registerLimiter` → `verifyRegisterCaptcha` → `authController.register`

### Muốn sửa thì sửa ở đâu

| Muốn đổi… | File | `Ctrl+F` |
|---|---|---|
| Giới hạn 5 lần/giờ/IP | `be/middlewares/rateLimit.js` | `registerLimiter` |
| Logic verify CAPTCHA | `be/middlewares/verifyCaptcha.js` | `verifyRegisterCaptcha` |
| Sinh mã CAPTCHA | `be/services/captcha.service.js` | `createCodeChallenge` |
| Chuỗi middleware route | `be/routes/user/auth.routes.js` | `router.post('/register'` |

**Trả lời ngắn:** Request qua rate limit + CAPTCHA trước khi vào `register`. Mật khẩu hash bcrypt, DB không có plain text.

---

## 2. Chọn bàn và ghép bàn?

**Câu hỏi:** 10 người xếp bàn sao? Ghép bàn ở đâu? Tránh trùng lịch thế nào?

### Mở ngay

```
be/services/reservation.service.js  →  Ctrl+F: createReservation
```

**Đọc đoạn này:**
- dòng 242: `expected_end_time` = arrival + `RESERVATION_BUFFER_MS` (2 giờ)
- dòng 268: tối đa **2** lượt đặt tương lai (`FUTURE_ACTIVE_LIMIT`)
- dòng 286: `pickAvailableTableWithLock` — chọn bàn trong transaction
- dòng 294, 323–324: `multi = picked.tables.length > 1` → `linkTablesToOrder` ghép bàn

### Muốn sửa thì sửa ở đâu

| Muốn đổi… | File | `Ctrl+F` |
|---|---|---|
| Thuật toán ghép bàn liền kề | `be/utils/tableAllocation.js` | `planTableAllocation` |
| Kiểm tra 2 khách trùng bàn | `be/utils/orderTableLinks.js` | `hasOverlappingBooking` |
| Validate 30 phút / 14 ngày / giờ mở cửa | `be/controllers/user/reservation.controller.js` | `createReservation controller` (dòng 58–66, 76–83) |

**Trong `planTableAllocation`:** 1 bàn đủ chỗ → `multi: false`; không đủ → tìm cụm bàn liền kề → `multi: true`.

**Trả lời ngắn:** Vào transaction, lock bàn, ưu tiên 1 bàn vừa chỗ, không được thì ghép bàn liền kề. Trùng lịch kiểm bằng khung giữ bàn 2 tiếng.

---

## 3. Vì sao khách không tự check-in?

**Câu hỏi:** Đặt online = đã ngồi chưa? Check-in ở đâu? Bàn đổi trạng thái thế nào?

### Mở ngay

```
be/services/admin/reception.service.js  →  Ctrl+F: confirmArrival
```

**Đọc đoạn này:**
- dòng 302–310: set `checked_in_at`, order → `pre-ordered` (nếu đang pending/confirmed)
- dòng 317–321: bàn → `TABLE_STATUS.OCCUPIED`

### Muốn sửa thì sửa ở đâu

| Muốn đổi… | File | `Ctrl+F` |
|---|---|---|
| API route check-in | `be/routes/admin/reception.routes.js` | `router.post('/check-in'` |
| Controller gọi service | `be/controllers/admin/reception.controller.js` | `confirmArrival` |
| Hằng số trạng thái bàn | `be/shared/tableStatus.js` (hoặc `be/utils/tableStatus.js` re-export) | `TABLE_STATUS` |

**Trả lời ngắn:** Đặt online chỉ giữ bàn. Nhân viên bấm tiếp nhận → `confirmArrival` set `checked_in_at` và bàn `occupied`.

---

## 4. Bếp nhận món realtime?

**Câu hỏi:** Gọi món xong bếp thấy ở đâu? WebSocket nằm chỗ nào?

### Mở ngay (3 chỗ, theo thứ tự)

**Bước 1 — Tạo món:**
```
be/services/admin/waiter.service.js  →  Ctrl+F: createOrder
```
→ `buildOrderItemPayloads` tạo `order_items` status `pending` (xem `be/utils/orderItemFactory.js` dòng 44)

**Bước 2 — Đẩy realtime cho bếp khi vừa gọi món:**
```
be/controllers/admin/waiter.controller.js  →  Ctrl+F: createOrder
```
→ dòng ~77 `realtimeHub.notifyBranch` với `reason: 'waiter_new_order'`

**Bước 3 — Bếp đổi trạng thái món + đẩy realtime:**
```
be/controllers/admin/kitchen.controller.js  →  Ctrl+F: changeOrderItemStatus
```
→ dòng ~37 `realtimeHub.notifyBranch` type `order_item_status`

**WebSocket hub:**
```
be/realtimeHub.js  →  Ctrl+F: notifyBranch
```

**Hàng đợi bếp (poll):** `be/services/admin/kitchen.service.js` → `getOrderItemsByStatus`

**Trả lời ngắn:** Gọi món tạo `order_items` pending, controller phục vụ bắn WebSocket cho bếp. Bếp cũng có thể poll API; khi đổi status món thì `notifyBranch` cập nhật realtime cho cả chi nhánh.

---

## 5. Thanh toán xong order và bàn đổi thế nào?

**Câu hỏi:** Xác nhận tiền mặt đóng phiên ở đâu? Vì sao bàn → chờ dọn?

### Mở ngay

```
be/services/payment.service.js  →  Ctrl+F: onPaymentSucceededByOrder
```

**Đọc đoạn này:**
- dòng 319–325: order → `completed`, `payment_status` → `succeeded`
- dòng 328–330: bàn → `TABLE_STATUS.CLEANING` ← **chỗ quan trọng nhất**
- dòng 342: `notifyBranch` báo thanh toán xong

### Muốn sửa thì sửa ở đâu

| Muốn đổi… | File | `Ctrl+F` |
|---|---|---|
| Nhân viên bấm thanh toán | `be/controllers/admin/waiter.controller.js` | `finalizePayment` |
| Entry service thanh toán | `be/services/payment.service.js` | `finalizeReservationPayment` |
| Tính tổng bill | `be/services/bill.service.js` | `buildBill` |
| Xuất PDF | `be/services/invoice.service.js` | `buildInvoicePdf` |

**Trả lời ngắn:** `finalizePayment` → `finalizeReservationPayment` → `onPaymentSucceededByOrder`. Order complete, bàn `cleaning` để nhân viên dọn.

---

## 6. Đánh giá sau bữa ăn kiểm soát thế nào?

**Câu hỏi:** Vì sao chỉ đánh giá sau thanh toán? Một order đánh giá mấy lần?

### Mở ngay

```
be/services/review.service.js  →  Ctrl+F: isOrderReviewable
```

**Đọc đoạn này:**
- dòng 36–45: `isOrderReviewable` — chỉ `completed` hoặc payment `succeeded` mới được review
- dòng 108+: `createOrderReview` — logic tạo review, chặn trùng

**Ràng buộc DB:** `be/models/Review.js` → `Ctrl+F: unique` → `order_id` unique (1 order = 1 review)

**Review qua QR:** `be/services/public/tableQr.service.js` → `Ctrl+F: createReviewByToken`

**Trả lời ngắn:** `isOrderReviewable` chặn trước khi tạo. DB unique `order_id` → mỗi phiên chỉ 1 đánh giá.

---

## 7. Nhật ký thao tác (audit log)?

**Câu hỏi:** Log ghi khi nào? Có lưu password không?

### Mở ngay

```
be/middlewares/operationLog.js  →  Ctrl+F: auditLog
```

**Đọc đoạn này:**
- dòng 34: `res.on('finish')` — **ghi sau khi response xong**, không chặn request

**Che password/token:**
```
be/services/operationLog.service.js  →  Ctrl+F: sanitizeBody
```
→ hàm `sanitizeBody` dòng 22

**Trả lời ngắn:** Middleware `auditLog` gắn route quan trọng, ghi sau response. Body được `sanitizeBody` che mật khẩu/token.

---

## 8. Phân quyền role và chi nhánh?

**Câu hỏi:** Waiter/kitchen/manager khác nhau ở đâu? Manager xem chi nhánh khác được không?

### Mở ngay

```
be/middlewares/auth.js  →  Ctrl+F: authorizeRole
```

**Đọc đoạn này:**
- dòng 120–121: role không trong list → **403**

**Giới hạn chi nhánh:**
```
be/utils/branchScope.js  →  Ctrl+F: resolveBranchId
```

**Ví dụ route chặn role:** `be/routes/admin/report.routes.js` → `enforceReportBranchScope`

**Trả lời ngắn:** `authorizeRole` chặn vai trò. `resolveBranchId` khóa manager/nhân viên vào `branch_id` của tài khoản.

---

## 9. No-show (hay bị hỏi thêm)

### Mở ngay

```
be/services/admin/tableSummary.service.js  →  Ctrl+F: expireReservationsForBranch
```

**Đọc đoạn này:**
- dòng 15: `OVERDUE_MINUTES = 15`
- dòng 31–58: SQL update `status = 'no_show'` + `users.locked = true`

**Scheduler gọi mỗi 60s:** `be/index.js` → `Ctrl+F: startReservationExpiryScheduler` (dòng 140 `RESERVATION_EXPIRY_SWEEP_MS`, dòng 155 gọi `expireReservationsForBranch`)

---

## Bài tập tự luyện (Ctrl+F là đủ)

| # | `Ctrl+F` | File gợi ý | Cần trả lời |
|---|---|---|---|
| 1 | `requestBill` | `be/controllers/user/reservation.controller.js` | Order → `waiting_payment` (dòng 357) |
| 2 | `tableQrOrderLimiter` | `be/middlewares/rateLimit.js` | Key `IP:token` ở dòng 65 — chống spam theo từng bàn |
| 3 | `planTableAllocation` | `be/utils/tableAllocation.js` | `multi: true` khi không có 1 bàn đủ chỗ, ghép cụm liền kề (dòng 106) |
| 4 | `onPaymentSucceededByOrder` | `be/services/payment.service.js` | Dòng 330 đổi bàn sang `cleaning` |
| 5 | `verifyToken` | `be/middlewares/auth.js` | Token hết hạn → **403** (dòng 59); hàm verify nằm ở `be/utils/jwt.js` |
| 6 | `getReviewEligibilityByToken` | `be/services/public/tableQr.service.js` | Dòng 219 `orderBelongsToTable` kiểm order thuộc bàn QR |

---

## Mẹo khi bảo vệ

1. **Bị hỏi "code ở đâu"** → nói tên **Service + hàm**, không đọc lan man nhiều file.
2. **Bị hỏi "sửa X thì sửa đâu"** → Service trước, Controller chỉ validate/gọi service.
3. **Bị hỏi sâu route** → mở file `be/routes/...` tương ứng, nhìn chuỗi middleware trên 1 dòng `router.post/get`.
