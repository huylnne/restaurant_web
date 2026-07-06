# Kịch bản demo — Đăng ký khách → Vòng dịch vụ → Quản trị Admin

Kịch bản **một lượt demo trực tiếp** (~15–20 phút) cho phản biện / bảo vệ: tự tạo tài khoản khách mới, trải nghiệm trọn vòng phục vụ, sau đó đăng nhập Admin xem các chức năng quản lý.

> **Chi nhánh demo:** Chi nhánh 1 — Hà Nội, Cầu Giấy  
> **URL:** http://localhost:5173  
> **Mật khẩu tài khoản nhân viên / admin có sẵn:** `123456`

---

## Mục lục

1. [Chuẩn bị](#1-chuẩn-bị)
2. [Phần 1 — Tạo tài khoản khách hàng](#2-phần-1--tạo-tài-khoản-khách-hàng)
3. [Phần 2 — Khách khám phá & đặt bàn](#3-phần-2--khách-khám-phá--đặt-bàn)
4. [Phần 3 — Vòng phục vụ tại nhà hàng](#4-phần-3--vòng-phục-vụ-tại-nhà-hàng)
5. [Phần 4 — Khách tại bàn, thanh toán, đánh giá](#5-phần-4--khách-tại-bàn-thanh-toán-đánh-giá)
6. [Phần 5 — Admin xem quản lý](#6-phần-5--admin-xem-quản-lý)
7. [Lời thoại gợi ý](#7-lời-thoại-gợi-ý)
8. [Checklist & xử lý sự cố](#8-checklist--xử-lý-sự-cố)

---

## 1. Chuẩn bị

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

### 1.2. Dọn dữ liệu demo cũ

Trước khi demo, chạy để không còn bàn/đơn đang treo:

```powershell
cd d:\DATN\restaurant_web\be
npm run cleanup:demo-orders -- --yes
```

### 1.3. Bố trí tab trình duyệt

| Tab | Dùng cho | Ghi chú |
|-----|----------|---------|
| Tab 1 | Khách hàng (tài khoản mới tạo) | Luồng chính |
| Tab 2 | Phục vụ `waiter1` | Check-in, gọi món, thanh toán |
| Tab 3 | Bếp `kitchen1` | Cập nhật trạng thái món |
| Tab 4 | Admin `admin` | Phần cuối — quản trị |

> **Mẹo:** Dùng Chrome Profile riêng hoặc cửa sổ Incognito cho từng vai trò để không bị đè token đăng nhập.

### 1.4. Thông tin tài khoản khách gợi ý

Chuẩn bị sẵn trước khi quay (đổi nếu username/SĐT đã tồn tại):

| Trường | Giá trị gợi ý |
|--------|----------------|
| Tên đăng nhập | `demo_khach01` |
| Mật khẩu | `12345678` |
| Họ và tên | `Nguyễn Văn Demo` |
| Số điện thoại | `0901234567` *(đổi số khác nếu báo trùng)* |

### 1.5. Ràng buộc khi đặt bàn

| Ràng buộc | Giá trị |
|-----------|---------|
| Đặt trước tối thiểu | 30 phút |
| Đặt xa nhất | 14 ngày |
| Buffer giữ bàn | 2 giờ |
| Grace check-in | 15 phút sau giờ hẹn |
| Số lượt đặt tương lai tối đa | 2 lượt / khách |

**Gợi ý khi demo:** Chọn **hôm nay, giờ hiện tại + 45–60 phút**, **4 người**.

---

## 2. Phần 1 — Tạo tài khoản khách hàng

**Thời lượng:** ~2 phút  
**Tab:** Tab 1 — chưa đăng nhập

### Bước 1.1 — Vào trang đăng ký

1. Mở **http://localhost:5173**
2. Bấm **Đăng nhập** → chọn **Đăng ký**, hoặc vào thẳng **/register**

### Bước 1.2 — Điền form đăng ký

1. **Tên đăng nhập:** `demo_khach01` *(chữ thường, số, gạch dưới; 3–30 ký tự)*
2. **Mật khẩu:** `12345678` *(8–32 ký tự)*
3. **Xác nhận mật khẩu:** `12345678`
4. **Họ và tên:** `Nguyễn Văn Demo`
5. **Số điện thoại:** `0901234567` *(10 số, bắt đầu bằng 0)*
6. Giải **CAPTCHA** → nút **Đăng ký** sáng lên
7. Bấm **Đăng ký** → chờ thông báo thành công

> **Highlight khi demo:** *"Hệ thống có CAPTCHA và giới hạn tần suất để chống spam đăng ký."*

### Bước 1.3 — Đăng nhập bằng tài khoản vừa tạo

1. Chuyển sang **Đăng nhập** (hoặc tự redirect)
2. Username: `demo_khach01`, password: `12345678`
3. Sau login → về trang chủ khách

### Bước 1.4 — Cập nhật hồ sơ (tuỳ chọn, ~30 giây)

1. Vào **Hồ sơ** → `/profile`
2. Xem / chỉnh thông tin cá nhân
3. *(Nói)*: *"Khách tự quản lý thông tin sau khi đăng ký."*

---

## 3. Phần 2 — Khách khám phá & đặt bàn

**Thời lượng:** ~4 phút  
**Tab:** Tab 1 — `demo_khach01`

### Bước 2.1 — Xem thực đơn (~1 phút)

1. Vào **Thực đơn** → `/menu`
2. Chọn **Chi nhánh 1 — Hà Nội, Cầu Giấy**
3. Lọc danh mục: Khai vị / Món chính / Đồ uống
4. Click xem chi tiết 1 món (ảnh, giá, mô tả)

### Bước 2.2 — Xem chi nhánh (~30 giây)

1. Vào **Chi nhánh** → `/branches`
2. Chỉ nhanh danh sách 7 chi nhánh
3. *(Nói)*: *"Mô hình đa chi nhánh — mỗi cơ sở có thực đơn và vận hành riêng."*

### Bước 2.3 — Đặt bàn + đặt món trước (~2 phút) ⭐

1. Vào **Đặt bàn** → `/booking`
2. Chọn:
   - **Chi nhánh:** Chi nhánh 1
   - **Ngày giờ đến:** hôm nay + ~1 giờ
   - **Số khách:** `4`
3. Bật **Đặt món trước** → chọn 2–3 món:
   - 1 khai vị
   - 1 món chính
   - 1 đồ uống
4. Ghi chú: *"Demo phản biện — cần bàn yên tĩnh"*
5. Bấm **Đặt bàn** → chờ thông báo thành công
6. Vào **Tài khoản** → `/dashboard` → xem lượt đặt vừa tạo (trạng thái `confirmed` / có món đặt trước)

> **Highlight:** Nếu hệ thống ghép 2 bàn liền kề → *"Hệ thống tự xếp bàn phù hợp, có thể ghép bàn khi nhóm đông."*

---

## 4. Phần 3 — Vòng phục vụ tại nhà hàng

**Thời lượng:** ~5 phút  
> Phần này cần Tab 2 (phục vụ) và Tab 3 (bếp) để hoàn tất vòng dịch vụ. Khách không thể tự check-in — đúng nghiệp vụ thực tế.

### Bước 3.1 — Phục vụ: sơ đồ bàn (~30 giây)

**Tab 2:** Đăng nhập `waiter1` / `123456` → `/admin/tables`

1. Filter **Chi nhánh 1**
2. Chỉ các trạng thái bàn:
   - 🟢 Trống
   - 🟡 Đã đặt trước *(lượt của demo_khach01)*
   - 🔴 Đang phục vụ
   - 🟠 Chờ dọn

### Bước 3.2 — Check-in khách đặt trước (~45 giây) ⭐

1. Tìm lượt đặt của **demo_khach01** / **Nguyễn Văn Demo**
2. Bấm **Tiếp nhận / Check-in**
3. Xác nhận → bàn chuyển **Đang phục vụ**
4. *(Nói)*: *"Khách đặt online, nhân viên chỉ check-in khi khách tới — không nhập lại thông tin."*

### Bước 3.3 — Gọi thêm món từ phía phục vụ (~45 giây)

1. Click vào bàn của **demo_khach01**
2. Mở dialog **Gọi món**
3. Thêm 1–2 món chưa đặt trước
4. Gửi order

### Bước 3.4 — Bếp: chế biến realtime (~2 phút) ⭐

**Tab 3:** Đăng nhập `kitchen1` / `123456` → `/admin/kitchen`

1. Filter **Chi nhánh 1**
2. Thấy món vừa gửi (đặt trước + gọi thêm)
3. *(Nói)*: *"Order đẩy realtime qua WebSocket — bếp không cần refresh."*
4. Cập nhật từng món (hoặc cả nhóm):
   - **Chờ chế biến** → **Đang chế biến**
   - **Đang chế biến** → **Hoàn thành**

### Bước 3.5 — Phục vụ: đánh dấu đã bưng ra (~30 giây)

**Quay lại Tab 2:**

1. Vào order bàn **demo_khach01**
2. Đánh dấu món **Đã phục vụ / Served**

### Bước 3.6 — Copy link QR bàn (~15 giây)

1. Trong dialog bàn, tìm **Mã QR / Link bàn**
2. Copy URL dạng `/t/{token}` — dùng ở Phần 4

---

## 5. Phần 4 — Khách tại bàn, thanh toán, đánh giá

**Thời lượng:** ~4 phút  
**Tab:** Tab 1 — `demo_khach01`

### Bước 4.1 — Trang "Bàn của tôi" (~45 giây)

1. Vào **Bàn của tôi** → `/my-table`
2. Xem trạng thái phiên, danh sách món, tiến độ bếp
3. Gọi thêm 1 món từ phía khách *(tuỳ chọn — thấy luồng 2 chiều)*

### Bước 4.2 — QR tại bàn (~45 giây) ⭐

1. Mở tab mới URL `/t/{token}` đã copy
2. Xem menu, bill tạm tính
3. *(Nói)*: *"QR giúp khách tự xem bill; gọi món qua QR khi bàn đang phục vụ."*

### Bước 4.3 — Yêu cầu thanh toán (~30 giây)

1. Từ **Bàn của tôi** hoặc QR → bấm **Yêu cầu thanh toán**
2. Trạng thái order → chờ thanh toán

### Bước 4.4 — Phục vụ xác nhận thanh toán (~1 phút) ⭐

**Tab 2 — `waiter1`:**

1. Bàn **demo_khach01** hiện badge chờ thanh toán
2. Mở dialog **Thanh toán**
3. Xem tổng bill (món đã phục vụ)
4. Chọn **Tiền mặt** *(nhanh nhất khi demo)*
5. Xác nhận → xuất **Hóa đơn PDF** nếu có nút
6. Bàn chuyển **Chờ dọn** → **Trống**

### Bước 4.5 — Khách xem lịch sử (~20 giây)

**Tab 1:**

1. Vào `/dashboard` → đơn vừa hoàn tất

### Bước 4.6 — Đánh giá sau bữa ăn (~45 giây) ⭐

1. Mở lại `/t/{token}` hoặc popup đánh giá
2. Chọn **4–5 sao**, viết nhận xét: *"Món ngon, phục vụ nhanh — demo đồ án"*
3. Gửi đánh giá

---

## 6. Phần 5 — Admin xem quản lý

**Thời lượng:** ~5 phút  
**Tab:** Tab 4 — đăng xuất khách, đăng nhập `admin` / `123456`

> Sau khi hoàn tất vòng khách, chuyển sang góc nhìn quản trị để chứng minh hệ thống ghi nhận đầy đủ dữ liệu vừa demo.

### Bước 5.1 — Dashboard tổng quan (~45 giây)

1. Vào **Quản lý nhà hàng** → `/admin`
2. Xem tổng quan: doanh thu, lượt phục vụ toàn chuỗi
3. *(Nói)*: *"Admin nhìn được toàn bộ 7 chi nhánh từ một màn hình."*

### Bước 5.2 — Tài khoản khách vừa tạo (~1 phút) ⭐

1. Vào **Tài khoản khách** → `/admin/customer-accounts`
2. Tìm `demo_khach01` / **Nguyễn Văn Demo**
3. Xem trạng thái tài khoản (đang hoạt động)
4. *(Tuỳ chọn)*: chỉ nút khóa/mở — **không bấm khóa** nếu còn demo tiếp

### Bước 5.3 — Quản lý chi nhánh (~45 giây)

1. Vào **Quản lý chi nhánh** → `/admin/branches`
2. Mở **Chi nhánh 1** — xem giờ mở cửa, địa chỉ, trạng thái
3. *(Nói)*: *"Mỗi chi nhánh có cấu hình vận hành riêng."*

### Bước 5.4 — Quản lý món ăn (~45 giây)

1. Vào **Quản lý món ăn** → `/admin/menu`
2. Filter **Chi nhánh 1**
3. Chỉ nhanh: danh mục, giá, trạng thái còn bán / hết hàng

### Bước 5.5 — Quản lý nhân viên (~45 giây)

1. Vào **Quản lý nhân viên** → `/admin/employees`
2. Lọc theo chi nhánh → thấy `waiter1`, `kitchen1`, `manager1`
3. *(Nói)*: *"Phân quyền theo vai trò và chi nhánh — ai làm việc nào chỉ thấy màn hình đó."*

### Bước 5.6 — Báo cáo & thống kê (~1 phút) ⭐

1. Vào **Báo cáo & Thống kê** → `/admin/reports`
2. Filter **Chi nhánh 1**, khoảng thời gian **hôm nay** hoặc **tháng này**
3. Xem doanh thu, món bán chạy từ đơn vừa thanh toán
4. *(Tuỳ chọn)*: bấm **Xuất Excel** hoặc **PDF**

### Bước 5.7 — Quản lý đánh giá (~30 giây)

1. Vào **Quản lý đánh giá** → `/admin/reviews`
2. Tìm đánh giá vừa gửi từ `demo_khach01`

### Bước 5.8 — Nhật ký thao tác (~45 giây) ⭐

1. Vào **Nhật ký thao tác** → `/admin/operation-logs`
2. Lọc theo thời gian / hành động
3. Chỉ các log liên quan luồng demo:
   - Đăng ký tài khoản
   - Đặt bàn
   - Check-in
   - Thanh toán
4. *(Nói)*: *"Mọi thao tác quan trọng được ghi lại để truy vết."*

### Bước 5.9 — Các màn vận hành (tuỳ chọn, ~30 giây)

Nếu còn thời gian, mở nhanh từ menu Admin:

| Màn hình | Đường dẫn | Ý nghĩa |
|----------|-----------|---------|
| Quản lý bàn / Phục vụ | `/admin/tables` | Sơ đồ bàn realtime |
| Bếp | `/admin/kitchen` | Hàng đợi món |

---

## 7. Lời thoại gợi ý

### Mở đầu (~20 giây)

> "Em xin demo từ góc khách hàng: tự đăng ký tài khoản mới, đặt bàn và trải nghiệm một vòng phục vụ hoàn chỉnh. Cuối cùng em vào Admin để xem dữ liệu được quản lý thế nào."

### Đăng ký (~15 giây)

> "Khách đăng ký qua form có CAPTCHA. Sau khi có tài khoản, khách có thể đặt bàn, theo dõi bàn và xem lịch sử đơn hàng."

### Đặt bàn (~20 giây)

> "Khách chọn chi nhánh, giờ đến và số người. Hệ thống kiểm tra giờ mở cửa, tránh trùng lịch với buffer 2 giờ, rồi tự gán bàn — có thể ghép bàn khi nhóm đông."

### Vòng phục vụ (~25 giây)

> "Khi khách tới, phục vụ check-in trên sơ đồ bàn. Món đẩy sang bếp realtime. Khách gọi thêm món hoặc quét QR xem bill, rồi yêu cầu thanh toán."

### Admin (~20 giây)

> "Admin quản lý toàn chuỗi: chi nhánh, nhân viên, tài khoản khách, thực đơn, báo cáo doanh thu và nhật ký thao tác. Đơn vừa demo đã phản ánh trên báo cáo và đánh giá."

### Kết (~15 giây)

> "Toàn bộ trên một nền tảng web: 5 vai trò, 7 chi nhánh, REST API kết hợp WebSocket realtime — từ lúc khách đăng ký đến khi quản trị theo dõi vận hành."

---

## 8. Checklist & xử lý sự cố

### Checklist sau khi demo

- [ ] Đăng ký tài khoản khách mới (+ CAPTCHA)
- [ ] Đăng nhập & cập nhật hồ sơ
- [ ] Xem menu theo chi nhánh
- [ ] Đặt bàn + đặt món trước
- [ ] Check-in (phục vụ)
- [ ] Gọi món (khách + phục vụ)
- [ ] Bếp: chờ → đang làm → hoàn thành (WebSocket)
- [ ] QR tại bàn + Bàn của tôi
- [ ] Yêu cầu thanh toán + xác nhận + hóa đơn
- [ ] Đánh giá sau bữa ăn
- [ ] Admin: dashboard, tài khoản khách, chi nhánh, menu, nhân viên
- [ ] Admin: báo cáo doanh thu, đánh giá, nhật ký thao tác

### Xử lý sự cố nhanh

| Triệu chứng | Cách xử lý |
|-------------|------------|
| Username/SĐT đã tồn tại khi đăng ký | Đổi `demo_khach02` hoặc SĐT khác |
| CAPTCHA không load | F5 trang; kiểm tra backend port 3000 |
| "Không còn bàn trống" khi đặt | `npm run cleanup:demo-orders -- --yes` |
| Khách không thấy "Bàn của tôi" | Chưa check-in — quay Tab phục vụ check-in |
| Bếp không thấy món mới | F5 cả 2 tab; kiểm tra backend đang chạy |
| Đặt bàn báo lỗi giờ | Chọn giờ +45 phút, tránh sát giờ đóng cửa |
| Review không hiện trên Admin | Order phải `completed`; thử trong vòng 4 giờ |
| Đăng xuất giữa chừng | Dùng Chrome Profile riêng cho mỗi vai trò |

### Timeline tóm tắt

```
[0:00]   Chuẩn bị + đăng ký tài khoản khách
[2:00]   Menu, chi nhánh, đặt bàn + pre-order
[6:00]   Phục vụ check-in + gọi món
[7:00]   Bếp chế biến realtime
[9:00]   Khách: Bàn của tôi + QR + yêu cầu thanh toán
[11:00]  Thanh toán + đánh giá
[13:00]  Admin: tài khoản khách, chi nhánh, menu, nhân viên
[16:00]  Admin: báo cáo, đánh giá, nhật ký
[18:00]  Kết
```

---

*Tài liệu liên quan: [LUONG_DEMO_VIDEO.md](./LUONG_DEMO_VIDEO.md) · [HUONG_DAN_CAI_DAT_VA_SU_DUNG.md](../HUONG_DAN_CAI_DAT_VA_SU_DUNG.md) · [CAU_HOI_PHAN_BIEN.md](./CAU_HOI_PHAN_BIEN.md)*
