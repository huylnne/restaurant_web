# Câu hỏi đọc code Backend — theo luồng demo chính

> **Kịch bản:** `Kich_ban_demo.docx` (mục 9)  
> **Mẫu trả lời mới:** `Trả lời nghiệp vụ trước → Chỉ chỗ code → Giải thích chỗ này làm gì`  
> **Mẹo:** Khi bị hỏi, nói 1-2 câu nghiệp vụ trước rồi mới mở file.

**Luồng code:** `Route → Middleware → Controller → Service → Utils`  
**Quy tắc:** Muốn đổi hành vi nghiệp vụ, sửa ở **Service** trước.

---

## Bảng tra nhanh (theo đúng thứ tự demo)

| Bước | Trả lời nghiệp vụ nhanh | File mở chính | `Ctrl+F` |
|---|---|---|---|
| 1 | Đăng ký đi qua chống spam + CAPTCHA, mật khẩu luôn hash trước khi lưu | `be/controllers/user/auth.controller.js` | `register` |
| 2 | Đặt bàn kiểm tra giờ hợp lệ, lock bàn, ưu tiên 1 bàn rồi mới ghép bàn | `be/services/reservation.service.js` | `createReservation` |
| 2 | Đặt món trước chỉ thêm `order_items`, chưa phải check-in | `be/controllers/user/order.controller.js` | `createOrder` |
| 3 | Check-in do nhân viên xác nhận, khi check-in thì bàn chuyển `occupied` | `be/services/admin/reception.service.js` | `confirmArrival` |
| 3 | Gọi món tạo `order_items` trạng thái `pending` và bắn realtime cho bếp | `be/services/admin/waiter.service.js` | `createOrder` |
| 4 | Bếp đổi status món theo thời gian thực và broadcast cho chi nhánh | `be/controllers/admin/kitchen.controller.js` | `changeOrderItemStatus` |
| 5 | Khách theo dõi tại bàn qua trang cá nhân hoặc QR, chỉ gửi yêu cầu thanh toán | `be/controllers/user/reservation.controller.js` | `requestBill` |
| 6 | Phục vụ xác nhận thanh toán xong thì order `completed`, bàn `cleaning` | `be/services/payment.service.js` | `onPaymentSucceededByOrder` |
| 7 | Chỉ được đánh giá sau khi hoàn tất phiên/đã thanh toán thành công | `be/services/review.service.js` | `isOrderReviewable` |
| 8 | Admin xem báo cáo, phân quyền chi nhánh, audit log truy vết thao tác | `be/routes/admin/report.routes.js` | `revenue-by-day` |

---

## 1) Đăng ký khách hàng

### Trả lời nghiệp vụ trước
Đăng ký không đi thẳng vào tạo user. Hệ thống chặn spam bằng rate limit, bắt buộc qua CAPTCHA, rồi mới tạo tài khoản; mật khẩu luôn hash bằng bcrypt nên DB không có mật khẩu thô.

### Chỉ chỗ code
- `be/routes/user/auth.routes.js` → `router.post('/register'`
- `be/controllers/user/auth.controller.js` → `register`
- `be/middlewares/rateLimit.js` → `registerLimiter`
- `be/middlewares/verifyCaptcha.js` → `verifyRegisterCaptcha`

### Giải thích chỗ này làm gì
- Route nối chuỗi middleware: `registerLimiter` → `validateRegisterBody` → `verifyRegisterCaptcha` → `auditLog` → controller.
- `register` kiểm tra trùng username/SDT, hash bằng `bcrypt.hash(password, 10)`, rồi `User.create`.
- Nếu cần chỉnh chính sách chống spam thì đổi ở `registerLimiter`; nếu cần đổi cơ chế CAPTCHA thì sửa `verifyRegisterCaptcha`.

---

## 2) Đặt bàn (+ đặt món trước)

### Trả lời nghiệp vụ trước
Đặt bàn có 3 lớp: validate thời gian đặt, tìm bàn khả dụng có khóa đồng thời (tránh race), và tự động ghép bàn nếu không có 1 bàn đủ chỗ. Đặt món trước chỉ là ghi món vào order đặt bàn, không thay cho check-in.

### Chỉ chỗ code
- `be/controllers/user/reservation.controller.js` → `createReservation`
- `be/services/reservation.service.js` → `createReservation`
- `be/utils/tableAllocation.js` → `planTableAllocation`
- `be/utils/orderTableLinks.js` → `hasOverlappingBooking`
- `be/controllers/user/order.controller.js` → `createOrder`

### Giải thích chỗ này làm gì
- Controller validate mốc thời gian: tối thiểu 30 phút, tối đa 14 ngày, và trong giờ mở cửa.
- Service tính `expected_end_time` (khung giữ bàn 2h), giới hạn số lượt đặt tương lai, rồi `pickAvailableTableWithLock` trong transaction.
- `planTableAllocation` ưu tiên 1 bàn đủ chỗ (`multi: false`), không đủ mới ghép cụm liền kề (`multi: true`).
- `hasOverlappingBooking` dùng để chặn trùng lịch bàn.
- `order.controller.createOrder` tạo `order_items` cho pre-order và bắn realtime `user_preorder`, nhưng chưa gắn `checked_in_at`.

---

## 3) Check-in và phục vụ

### Trả lời nghiệp vụ trước
Khách đặt online chưa được tính là đã vào bàn. Chỉ khi nhân viên check-in thì phiên mới chuyển sang đang phục vụ và bàn chuyển `occupied`. Sau đó phục vụ gọi món thì bếp nhận ngay.

### Chỉ chỗ code
- `be/services/admin/reception.service.js` → `confirmArrival`
- `be/routes/admin/reception.routes.js` → `router.post('/check-in'`
- `be/services/admin/reception.service.js` → `walkInCheckIn`
- `be/services/admin/waiter.service.js` → `createOrder`
- `be/controllers/admin/waiter.controller.js` → `createOrder`

### Giải thích chỗ này làm gì
- `confirmArrival` set `checked_in_at`; nếu trạng thái đang pending/confirmed thì nâng lên luồng phục vụ và đổi bàn sang `occupied`.
- `walkInCheckIn` xử lý khách vãng lai, tạo phiên phục vụ mới khi có bàn phù hợp.
- `waiter.service.createOrder` dựng payload món (`buildOrderItemPayloads`) với status `pending`.
- `waiter.controller.createOrder` gọi `notifyBranch` reason `waiter_new_order` để bếp/phục vụ cập nhật realtime.

---

## 4) Bếp chế biến (realtime)

### Trả lời nghiệp vụ trước
Bếp nhận hàng đợi món theo trạng thái, đổi từ `pending` sang `processing/done`, và mọi thay đổi được đẩy realtime để phục vụ/khách nhìn thấy ngay.

### Chỉ chỗ code
- `be/services/admin/kitchen.service.js` → `getOrderItemsByStatus`
- `be/controllers/admin/kitchen.controller.js` → `changeOrderItemStatus`
- `be/realtimeHub.js` → `notifyBranch`

### Giải thích chỗ này làm gì
- `getOrderItemsByStatus` trả danh sách món cho màn bếp theo branch và status.
- `changeOrderItemStatus` cập nhật DB qua service, sau đó bắn `notifyBranch` với event `order_item_status`.
- `realtimeHub.notifyBranch` là điểm broadcast theo `branchId`.

---

## 5) Khách theo dõi tại bàn

### Trả lời nghiệp vụ trước
Trong phiên đang ăn, khách theo dõi món và bill tạm qua trang "Bàn của tôi" hoặc QR tại bàn. Khi cần thanh toán, khách chỉ gửi yêu cầu; quyền chốt thanh toán thuộc nhân viên.

### Chỉ chỗ code
- `be/controllers/user/user.controller.js` → `getCurrentTableSession`, `getCurrentBill`
- `be/services/public/tableQr.service.js` → `getTableByToken`, `getBillByToken`
- `be/controllers/user/reservation.controller.js` → `requestBill`

### Giải thích chỗ này làm gì
- `getCurrentTableSession` và `getCurrentBill` trả dữ liệu phiên hiện tại cho user đã đăng nhập.
- `getTableByToken` quyết định `can_order` theo trạng thái bàn + order active, đồng thời phát `order_access_token` khi đủ điều kiện.
- `requestBill` đổi trạng thái order sang `waiting_payment` để nhân viên biết bàn đang chờ thanh toán.

---

## 6) Thanh toán

### Trả lời nghiệp vụ trước
Thanh toán là luồng 2 bước: khách yêu cầu trước, nhân viên xác nhận sau. Khi xác nhận thành công, hệ thống đóng phiên phục vụ và đưa bàn sang `cleaning` để dọn dẹp.

### Chỉ chỗ code
- `be/controllers/admin/waiter.controller.js` → `finalizePayment`
- `be/services/payment.service.js` → `finalizeReservationPayment`
- `be/services/payment.service.js` → `onPaymentSucceededByOrder`
- `be/services/bill.service.js` → `buildBill`

### Giải thích chỗ này làm gì
- `finalizePayment` nhận thao tác từ nhân viên, chuyển sang payment service.
- `finalizeReservationPayment` xác định order cần chốt theo `tableId/orderId/reservationId`.
- `onPaymentSucceededByOrder` cập nhật order `completed` + `payment_status=succeeded`, đồng thời đổi bàn `cleaning`.
- Sau khi cập nhật xong, service bắn `notifyBranch` reason `payment_succeeded` để UI đồng bộ realtime.

---

## 7) Đánh giá sau bữa ăn

### Trả lời nghiệp vụ trước
Khách chỉ được đánh giá khi phiên đã hoàn tất hoặc đã ghi nhận thanh toán thành công. Mỗi order chỉ được 1 review.

### Chỉ chỗ code
- `be/services/review.service.js` → `isOrderReviewable`
- `be/services/review.service.js` → `createOrderReview`
- `be/models/Review.js` → unique `order_id`
- `be/services/public/tableQr.service.js` → `createReviewByToken`

### Giải thích chỗ này làm gì
- `isOrderReviewable` kiểm điều kiện nghiệp vụ: `completed` hoặc payment `succeeded`.
- `createOrderReview` tạo review khi đủ điều kiện, chặn các case không hợp lệ.
- Unique `order_id` ở model là chặn cứng tầng dữ liệu: 1 phiên/1 đánh giá.
- `createReviewByToken` cho kênh QR dùng cùng policy review.

---

## 8) Admin kiểm tra dữ liệu sau demo


### Trả lời nghiệp vụ trước
Sau demo, admin phải chứng minh hệ thống ghi nhận xuyên suốt: báo cáo doanh thu, phân quyền theo vai trò/chi nhánh, và truy vết thao tác qua audit log.

### Chỉ chỗ code
- `be/routes/admin/report.routes.js` → `revenue-by-day`, `top-selling`, `overview`
- `be/middlewares/operationLog.js` → `auditLog`
- `be/services/operationLog.service.js` → `sanitizeBody`
- `be/middlewares/auth.js` → `authorizeRole`
- `be/utils/branchScope.js` → `resolveBranchId`

### Giải thích chỗ này làm gì
- Report routes có scope cho manager, không cho override chi nhánh ngoài quyền.
- `auditLog` ghi sau response (`res.on('finish')`) nên không làm chậm luồng chính.
- `sanitizeBody` che dữ liệu nhạy cảm (password/token) trước khi ghi log.
- `authorizeRole` chặn role không đủ quyền (403); `resolveBranchId` khóa phạm vi branch theo user.

---

## Phụ lục — No-show (ngoài luồng demo chính)

### Trả lời nghiệp vụ trước
Khách quá giờ không check-in sẽ bị đánh dấu no-show để giải phóng tài nguyên bàn và xử lý ràng buộc tài khoản nếu cần.

### Chỉ chỗ code
- `be/services/admin/tableSummary.service.js` → `expireReservationsForBranch`
- `be/index.js` → `startReservationExpiryScheduler`

### Giải thích chỗ này làm gì
- Dùng ngưỡng `OVERDUE_MINUTES = 15` để xác định no-show.
- Scheduler chạy định kỳ để quét và cập nhật trạng thái tự động.

---

## Mẫu trả lời miệng khi demo

1. **Nghiệp vụ trước:** "Luồng này xử lý như sau..." (1-2 câu).
2. **Chỉ chỗ:** "Em mở `service X`, hàm `Y`."
3. **Giải thích:** "Đoạn này làm A, đoạn kia làm B."
4. **Nếu hỏi sửa ở đâu:** trả lời Service trước, rồi mới Controller/Route.
