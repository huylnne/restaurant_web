# Luồng demo quay video — Restaurant Web

Kịch bản **một luồng end-to-end** (~12–15 phút) cover đủ tính năng chính cho video thuyết trình / demo phản biện.

> Chi nhánh demo: **Chi nhánh 1 — Hà Nội, Cầu Giấy**  
> Mật khẩu tất cả tài khoản: **`123456`**

---

## Mục lục

1. [Chuẩn bị trước khi quay](#1-chuẩn-bị-trước-khi-quay)
2. [Bố cục màn hình khi quay](#2-bố-cục-màn-hình-khi-quay)
3. [Kịch bản chính — Vòng đời phục vụ](#3-kịch-bản-chính--vòng-đời-phục-vụ)
4. [Phần bổ sung — Quản trị & đa chi nhánh](#4-phần-bổ-sung--quản-trị--đa-chi-nhánh)
5. [Lời thoại gợi ý (voice-over)](#5-lời-thoại-gợi-ý-voice-over)
6. [Checklist tính năng đã demo](#6-checklist-tính-năng-đã-demo)
7. [Xử lý sự cố khi quay](#7-xử-lý-sự-cố-khi-quay)

---

## 1. Chuẩn bị trước khi quay

### 1.1. Khởi động hệ thống

```powershell
# Terminal 1 — Backend
cd d:\DATN\restaurant_web\be
npm run dev

# Terminal 2 — Frontend
cd d:\DATN\restaurant_web\vue-fe
npm run dev
```

Mở trình duyệt: **http://localhost:5173**

### 1.2. Dọn dữ liệu demo cũ (quan trọng)

Trước mỗi lần quay, chạy để không còn bàn/đơn đang active:

```powershell
cd d:\DATN\restaurant_web\be
npm run cleanup:demo-orders -- --yes
```

Nếu DB lộn xộn hoặc thiếu dữ liệu:

```powershell
node scripts/reseed-all.js
```

### 1.3. Tài khoản dùng trong kịch bản

| Tab / cửa sổ | Username | Vai trò | URL sau đăng nhập |
|--------------|----------|---------|-------------------|
| Tab 1 — Khách | `ngochuy` | Khách hàng | `/` |
| Tab 2 — Phục vụ | `waiter1` | Nhân viên phục vụ | `/admin/tables` |
| Tab 3 — Bếp | `kitchen1` | Nhân viên bếp | `/admin/kitchen` |
| Tab 4 — Quản lý | `manager1` | Quản lý chi nhánh | `/admin/my-branch` |
| Tab 5 — Admin | `admin` | Quản trị hệ thống | `/admin` |

> **Mẹo quay:** Dùng Chrome **Profile** riêng hoặc **Incognito + Normal** để giữ 5 phiên đăng nhập cùng lúc mà không bị đè token.

### 1.4. Thời gian đặt bàn gợi ý

Khi quay, chọn giờ đến thỏa các ràng buộc:

| Ràng buộc | Giá trị |
|-----------|---------|
| Đặt trước tối thiểu | 30 phút |
| Đặt xa nhất | 14 ngày |
| Buffer giữ bàn | 2 giờ (không đặt sát giờ đóng cửa) |
| Grace check-in | 15 phút sau giờ hẹn |

**Gợi ý khi quay:** Chọn **hôm nay, giờ hiện tại + 45–60 phút**, số khách **4 người** (đủ để hệ thống có thể tự ghép bàn nếu cần).

---

## 2. Bố cục màn hình khi quay

### Cách 1 — Quay từng phần (dễ edit)

Quay 5 clip riêng theo tab, ghép trong CapCut / Premiere:

1. Khách (3–4 phút)
2. Phục vụ (3–4 phút)
3. Bếp realtime (2 phút)
4. Thanh toán + đánh giá (2 phút)
5. Quản trị (2–3 phút)

### Cách 2 — Quay split-screen (ấn tượng hơn)

| Vùng màn hình | Nội dung |
|---------------|----------|
| Trái (60%) | Tab đang thao tác chính |
| Phải trên | Tab Bếp — để thấy WebSocket realtime |
| Phải dưới | Tab Phục vụ — sơ đồ bàn |

Zoom trình duyệt **100%**, tắt bookmark bar, ẩn extension.

---

## 3. Kịch bản chính — Vòng đời phục vụ

> **Câu chuyện demo:** Khách **Ngọc Huy** xem menu → đặt bàn chi nhánh 1 cho 4 người → đặt trước vài món → nhân viên tiếp nhận → gọi thêm món → bếp chế biến realtime → thanh toán → đánh giá.

---

### PHẦN A — Khách hàng (~3 phút)

**Tab:** `ngochuy` — chưa đăng nhập

#### A1. Trang chủ & giới thiệu (20 giây)

1. Mở **http://localhost:5173/**
2. Lướt qua hero, nút **Thực đơn** / **Đặt bàn**
3. *(Nói)*: "Đây là cổng thông tin khách hàng của chuỗi nhà hàng đa chi nhánh."

#### A2. Xem thực đơn theo chi nhánh (30 giây)

1. Vào **Thực đơn** → `/menu`
2. Chọn **Chi nhánh 1 — Hà Nội, Cầu Giấy**
3. Lọc theo danh mục (Khai vị / Món chính / Đồ uống)
4. Click xem chi tiết 1 món (ảnh, giá, mô tả)

#### A3. Xem danh sách chi nhánh (20 giây — tuỳ chọn)

1. Vào **Chi nhánh** → `/branches`
2. Chỉ nhanh 7 chi nhánh, tìm kiếm hoặc lọc

#### A4. Đăng nhập (15 giây)

1. **Đăng nhập** → username `ngochuy`, password `123456`
2. Sau login redirect về trang khách

#### A5. Đặt bàn + đặt món trước (1,5 phút) ⭐

1. Vào **Đặt bàn** → `/booking`
2. Chọn:
   - **Chi nhánh:** Chi nhánh 1
   - **Ngày giờ đến:** hôm nay + ~1 giờ
   - **Số khách:** `4`
3. Bật **Đặt món trước** (nếu có toggle) → chọn 2–3 món (vd: 1 khai vị + 1 món chính + 1 nước)
4. Nhập ghi chú: *"Sinh nhật, cần bàn yên tĩnh"*
5. Bấm **Đặt bàn** → chờ thông báo thành công
6. Mở **Tài khoản** → `/dashboard` → xem lịch sử đặt bàn vừa tạo (trạng thái `confirmed` / `pre-ordered`)

> **Highlight khi quay:** Nếu hệ thống ghép 2 bàn → nói *"Hệ thống tự xếp bàn phù hợp, có thể ghép bàn liền kề khi nhóm đông."*

---

### PHẦN B — Nhân viên phục vụ (~3 phút)

**Tab:** `waiter1` — đăng nhập sẵn tại `/admin/tables`

#### B1. Sơ đồ bàn realtime (30 giây)

1. Chọn filter **Chi nhánh 1**
2. Chỉ các trạng thái bàn:
   - 🟢 Trống
   - 🟡 Đã đặt trước (reservation vừa tạo)
   - 🔴 Đang phục vụ
   - 🟠 Chờ dọn

#### B2. Check-in khách đặt trước (45 giây) ⭐

1. Tìm lượt đặt của **ngochuy** trong danh sách / trên bàn màu "đã đặt"
2. Bấm **Tiếp nhận / Check-in**
3. Xác nhận → bàn chuyển **Đang phục vụ**
4. *(Nói)*: "Khách đặt online, nhân viên chỉ cần check-in khi khách tới — không nhập lại thông tin."

#### B3. Demo walk-in nhanh (45 giây — tuỳ chọn, bỏ nếu thiếu thời gian)

1. Bấm **Khách walk-in**
2. Nhập **2 khách**, chọn 1 bàn trống
3. Xác nhận mở phiên → bàn chuyển đang phục vụ
4. *(Nói)*: "Khách vào trực tiếp không cần tài khoản — phục vụ mở phiên tại quầy."

> Chỉ demo walk-in nếu còn bàn trống; sau đó **tập trung lại lượt của ngochuy**.

#### B4. Gọi thêm món từ phía phục vụ (45 giây)

1. Click vào bàn của **ngochuy**
2. Mở dialog **Gọi món** / Order
3. Thêm 1–2 món chưa đặt trước
4. Gửi order → chuyển sang Tab Bếp

#### B5. Copy link QR bàn (15 giây)

1. Trong dialog bàn, tìm **Mã QR / Link bàn**
2. Copy URL dạng `/t/{token}` — dùng ở Phần D

---

### PHẦN C — Bếp realtime (~2 phút) ⭐

**Tab:** `kitchen1` — `/admin/kitchen`

> **Quan trọng khi quay:** Giữ Tab Bếp và Tab Phục vụ cùng visible để thấy cập nhật đồng bộ.

#### C1. Nhận món mới (30 giây)

1. Filter **Chi nhánh 1**
2. Thấy món vừa gửi xuất hiện (món đặt trước + món gọi thêm)
3. *(Nói)*: "Order đẩy realtime qua WebSocket, bếp không cần refresh."

#### C2. Cập nhật trạng thái món (1 phút)

Với từng món (hoặc cả nhóm):

1. **Chờ chế biến** → bấm **Đang chế biến**
2. **Đang chế biến** → bấm **Hoàn thành**

Quay nhanh Tab Phục vụ: trạng thái món trên order cũng đổi theo.

#### C3. Phục vụ đánh dấu "Đã bưng ra" (30 giây)

**Quay lại Tab Phục vụ:**

1. Vào order bàn **ngochuy**
2. Đánh dấu món **Đã phục vụ / Served** khi bưng ra

---

### PHẦN D — Khách tại bàn + QR (~2 phút)

**Tab:** `ngochuy`

#### D1. Trang "Bàn của tôi" (45 giây)

1. Vào **Bàn của tôi** → `/my-table`
2. Xem trạng thái phiên, danh sách món, tiến độ bếp
3. Gọi thêm 1 món từ phía khách *(tuỳ chọn — thấy luồng 2 chiều)*

#### D2. Quét QR / mở link bàn (45 giây) ⭐

1. Mở tab mới (hoặc điện thoại quay cận) URL `/t/{token}` đã copy
2. Xem menu, bill tạm tính
3. *(Nói)*: "QR giúp khách tự xem bill; gọi món qua QR chỉ hoạt động khi bàn đang phục vụ thật."

#### D3. Yêu cầu thanh toán (30 giây)

1. Từ **Bàn của tôi** hoặc QR → bấm **Yêu cầu thanh toán**
2. Trạng thái order → `waiting_payment`

---

### PHẦN E — Thanh toán (~1,5 phút) ⭐

**Tab:** `waiter1`

#### E1. Xác nhận thanh toán (1 phút)

1. Bàn **ngochuy** hiện badge chờ thanh toán
2. Mở dialog **Thanh toán**
3. Xem tổng bill (món đã phục vụ)
4. Chọn phương thức:
   - **Tiền mặt** *(nhanh nhất khi quay)* hoặc
   - **Chuyển khoản / VietQR** *(nếu muốn show tích hợp SePay)*
5. Xác nhận → xuất **Hóa đơn PDF** (nếu có nút)
6. Bàn chuyển **Chờ dọn** → sau đó **Trống**

#### E2. Khách xem lịch sử (15 giây)

**Tab `ngochuy`:** `/dashboard` → đơn vừa hoàn tất.

---

### PHẦN F — Đánh giá (~1 phút)

**Tab:** QR hoặc `ngochuy`

1. Sau thanh toán, mở lại `/t/{token}` hoặc popup đánh giá tự hiện
2. Chọn **4–5 sao**, viết nhận xét ngắn
3. Gửi đánh giá

**Tab `manager1`:** Vào **Quản lý đánh giá** → `/admin/reviews` → thấy review vừa gửi.

---

## 4. Phần bổ sung — Quản trị & đa chi nhánh

Quay thêm **2–3 phút** (có thể là clip riêng cuối video):

### G1. Quản lý chi nhánh — `manager1` (~1 phút)

| Thao tác | Màn hình |
|----------|----------|
| Xem thông tin chi nhánh | `/admin/my-branch` |
| Sửa giá / tắt món hết hàng | `/admin/menu` |
| Xem báo cáo doanh thu | `/admin/reports` — lọc tháng này, xem món bán chạy |
| Xuất Excel/PDF | Nút export trên màn báo cáo |

### G2. Admin hệ thống — `admin` (~1,5 phút)

| Thao tác | Màn hình | Highlight |
|----------|----------|-----------|
| Dashboard tổng quan | `/admin` | Doanh thu / lượt phục vụ toàn chuỗi |
| Quản lý 7 chi nhánh | `/admin/branches` | Mô hình đa chi nhánh |
| Quản lý nhân viên | `/admin/employees` | Phân quyền theo chi nhánh |
| Tài khoản khách | `/admin/customer-accounts` | Khóa/mở tài khoản |
| Nhật ký thao tác | `/admin/operation-logs` | Truy vết ai làm gì |
| Đổi filter chi nhánh | Bất kỳ màn admin | Admin xem được mọi cơ sở |

### G3. Tính năng phụ — demo nhanh nếu bị hỏi (~30 giây mỗi cái)

| Tính năng | Cách demo |
|-----------|-----------|
| Đăng ký + CAPTCHA | `/register` — không cần hoàn tất |
| No-show tự động | Giải thích bằng lời: quá 15 phút không check-in → hủy + khóa TK |
| Ghép bàn | Đặt bàn 8–10 khách → hệ thống gợi ý nhiều bàn |
| Phân quyền | Đăng nhập `kitchen1` → menu chỉ có **Bếp** |

---

## 5. Lời thoại gợi ý (voice-over)

Dùng làm script lồng tiếng hoặc nói khi quay:

### Mở đầu (15 giây)

> "Em xin demo hệ thống quản lý nhà hàng đa chi nhánh — từ lúc khách đặt bàn online cho đến khi thanh toán và đánh giá, đồng bộ realtime giữa phục vụ và bếp."

### Đặt bàn (20 giây)

> "Khách chọn chi nhánh, giờ đến và số người. Hệ thống kiểm tra giờ mở cửa, tránh trùng lịch với buffer 2 giờ, rồi tự gán bàn phù hợp — có thể ghép bàn khi nhóm đông."

### Check-in (15 giây)

> "Nhân viên phục vụ nhìn sơ đồ bàn realtime, check-in khách đặt trước hoặc mở phiên walk-in cho khách vào trực tiếp."

### Bếp (15 giây)

> "Món mới đẩy sang màn bếp qua WebSocket. Bếp cập nhật trạng thái, phục vụ thấy ngay để bưng món."

### QR & thanh toán (20 giây)

> "Khách quét QR tại bàn để xem bill và yêu cầu thanh toán. Phục vụ xác nhận, hệ thống ghi doanh thu cho báo cáo và giải phóng bàn."

### Kết (15 giây)

> "Toàn bộ luồng trên một nền tảng web: 5 vai trò, 7 chi nhánh demo, REST API kết hợp WebSocket realtime."

---

## 6. Checklist tính năng đã demo

Đánh dấu sau khi quay xong:

- [ ] Xem menu theo chi nhánh + lọc danh mục
- [ ] Danh sách chi nhánh (đa chi nhánh)
- [ ] Đặt bàn online + ràng buộc giờ
- [ ] Đặt món trước (pre-order)
- [ ] Tự xếp / ghép bàn
- [ ] Sơ đồ bàn realtime (UC10)
- [ ] Check-in khách đặt, trước
- [ ] Walk-in (tuỳ chọn)
- [ ] Gọi món (khách + phục vụ)
- [ ] Bếp: chờ → đang làm → hoàn thành (WebSocket)
- [ ] Phục vụ: đánh dấu đã bưng ra
- [ ] QR tại bàn (`/t/:token`)
- [ ] Yêu cầu thanh toán
- [ ] Xác nhận thanh toán + hóa đơn
- [ ] Đánh giá sau bữa ăn (UC13)
- [ ] Báo cáo doanh thu (manager)
- [ ] Quản trị đa chi nhánh (admin)
- [ ] Nhật ký thao tác (admin)
- [ ] Phân quyền theo vai trò

**Coverage use case:** UC05 (đặt bàn), UC08 (gọi món), UC10 (bàn), UC13 (đánh giá) + quản trị.

---

## 7. Xử lý sự cố khi quay

| Triệu chứng | Cách xử lý nhanh |
|-------------|------------------|
| "Không còn bàn trống" khi đặt | `npm run cleanup:demo-orders -- --yes` rồi thử lại |
| Bếp không thấy món mới | F5 cả 2 tab; kiểm tra backend đang chạy port 3000 |
| Khách không thấy "Bàn của tôi" | Chưa check-in — quay lại Tab phục vụ check-in |
| Đặt bàn báo lỗi giờ | Chọn giờ +45 phút, tránh sát giờ đóng cửa |
| QR không gọi được món | Bàn chưa ở trạng thái "đang phục vụ" |
| Token hết hạn / đăng xuất giữa chừng | Dùng Chrome Profile riêng cho mỗi vai trò |
| Review không hiện | Order phải `completed`; thử trong vòng 4 giờ sau ăn |

---

## Timeline tóm tắt (1 lượt quay liên tục)

```
[0:00]  A — Khách: menu, đăng nhập, đặt bàn + pre-order
[3:00]  B — Phục vụ: sơ đồ bàn, check-in
[5:00]  B — Gọi thêm món
[5:30]  C — Bếp: nhận món → làm → xong (split screen)
[7:30]  B — Đánh dấu đã bưng ra
[8:00]  D — Khách: Bàn của tôi + QR
[9:00]  E — Thanh toán
[10:00] F — Đánh giá + manager xem review
[11:00] G — Admin/manager: báo cáo, chi nhánh (optional)
[13:00] Kết
```

---

*Tài liệu liên quan: [HUONG_DAN_CAI_DAT_VA_SU_DUNG.md](../HUONG_DAN_CAI_DAT_VA_SU_DUNG.md) · [CAU_HOI_PHAN_BIEN.md](./CAU_HOI_PHAN_BIEN.md) · [SCRIPT_THUYET_TRINH_15P.md](./SCRIPT_THUYET_TRINH_15P.md)*
