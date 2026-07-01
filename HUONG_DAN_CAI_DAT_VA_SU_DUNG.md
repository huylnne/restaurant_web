# Hướng dẫn cài đặt và sử dụng — Restaurant Web

Hệ thống quản lý nhà hàng đa chi nhánh: đặt bàn, gọi món, bếp, thanh toán và quản trị.

---

## Mục lục

1. [Giới thiệu](#1-giới-thiệu)
2. [Yêu cầu hệ thống](#2-yêu-cầu-hệ-thống)
3. [Cấu trúc dự án](#3-cấu-trúc-dự-án)
4. [Cài đặt](#4-cài-đặt)
5. [Chạy ứng dụng](#5-chạy-ứng-dụng)
6. [Tài khoản demo](#6-tài-khoản-demo)
7. [Hướng dẫn sử dụng theo vai trò](#7-hướng-dẫn-sử-dụng-theo-vai-trò)
8. [Scripts hữu ích](#8-scripts-hữu-ích)
9. [Triển khai production](#9-triển-khai-production)
10. [Xử lý sự cố](#10-xử-lý-sự-cố)

---

## 1. Giới thiệu

**Restaurant Web** là ứng dụng full-stack gồm:

| Thành phần | Công nghệ |
|------------|-----------|
| Frontend | Vue 3, Vite, Element Plus, Vue Router, Axios |
| Backend | Node.js, Express 5, Sequelize |
| Cơ sở dữ liệu | PostgreSQL |
| Realtime | WebSocket (`ws://localhost:3000/ws/realtime`) |

Các nghiệp vụ chính:

- Khách hàng: xem menu, đặt bàn, gọi món, theo dõi bàn, thanh toán, đánh giá
- Nhân viên phục vụ: quản lý bàn, tạo order, xác nhận thanh toán
- Nhân viên bếp: nhận và cập nhật trạng thái món ăn (đồng bộ realtime)
- Quản lý chi nhánh: báo cáo, thực đơn, đánh giá
- Admin: quản lý đa chi nhánh, nhân sự, tài khoản khách

---

## 2. Yêu cầu hệ thống

| Phần mềm | Phiên bản tối thiểu |
|----------|---------------------|
| Node.js | 18+ |
| npm | đi kèm Node.js |
| PostgreSQL | 14+ |
| Docker Desktop | tùy chọn (chạy PostgreSQL bằng container) |
| Trình duyệt | Chrome, Edge hoặc Firefox (phiên bản mới) |

**Khuyến nghị IDE:** Visual Studio Code + extension Volar (Vue).

---

## 3. Cấu trúc dự án

```
restaurant_web/
├── be/              # Backend API (Express + Sequelize)
├── vue-fe/          # Frontend SPA (Vue 3 + Vite)
├── tests/           # Kiểm thử shared constants
├── docs/            # Tài liệu đồ án
├── docker-compose.yml
└── README.md
```

- Backend chạy tại `http://localhost:3000`
- Frontend dev chạy tại `http://localhost:5173` (proxy `/api` → backend)
- Upload ảnh lưu tại `be/uploads/`

---

## 4. Cài đặt

### Bước 1 — Clone / tải mã nguồn

```powershell
cd D:\DATN
# hoặc thư mục bạn đã giải nén dự án
cd restaurant_web
```

### Bước 2 — Khởi động PostgreSQL

**Cách 1: Docker (khuyến nghị)**

```powershell
docker compose up -d
```

Thông tin kết nối mặc định:

```
postgres://postgres:postgres@localhost:5432/restaurant
```

**Cách 2: Cài PostgreSQL trực tiếp**

Tạo database tên `restaurant`, sau đó dùng chuỗi kết nối phù hợp trong bước tiếp theo.

### Bước 3 — Cấu hình Backend

```powershell
cd be
copy .env.example .env
```

Mở file `be/.env` và chỉnh các biến sau:

| Biến | Mô tả | Ví dụ |
|------|-------|-------|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL | `postgres://postgres:postgres@localhost:5432/restaurant` |
| `JWT_SECRET` | Khóa bí mật JWT (**bắt buộc**, tối thiểu 16 ký tự) | Chuỗi ngẫu nhiên dài |
| `PORT` | Cổng API | `3000` |
| `DB_SYNC_ALTER` | Tạo/cập nhật bảng từ model (chỉ lần đầu) | `true` |

Các biến tùy chọn khác (thanh toán VietQR, CAPTCHA…) có thể để trống khi chạy local.

Cài dependency:

```powershell
npm install
```

### Bước 4 — Tạo cấu hình Sequelize CLI (cho seed dữ liệu)

Tạo file `be/config/config.json`:

```json
{
  "development": {
    "use_env_variable": "DATABASE_URL",
    "dialect": "postgres"
  }
}
```

### Bước 5 — Khởi tạo database lần đầu

**5.1. Tạo bảng**

Trong `be/.env`, đặt:

```
DB_SYNC_ALTER=true
```

Chạy backend một lần để Sequelize tạo bảng và chạy migration:

```powershell
npm run dev
```

Đợi thấy log `✅ Kết nối DB thành công` và `✅ Server đang chạy`, sau đó nhấn `Ctrl+C` dừng server.

**5.2. Nạp dữ liệu demo**

```powershell
node scripts/reseed-all.js
```

Lệnh này chạy migration nhẹ, xóa seed cũ (nếu có) và nạp lại: chi nhánh, tài khoản, thực đơn, đơn hàng mẫu.

**5.3. Tắt sync alter**

Sau khi khởi tạo xong, xóa hoặc comment dòng `DB_SYNC_ALTER=true` trong `.env` để tránh thay đổi schema không mong muốn ở các lần chạy sau.

### Bước 6 — Cài đặt Frontend

```powershell
cd ..\vue-fe
npm install
```

**Cấu hình API local (khuyến nghị):**

Tạo hoặc chỉnh file `vue-fe/.env.development.local`:

```
VITE_API_URL=http://localhost:3000
```

File này chỉ áp dụng khi chạy `npm run dev`, không ảnh hưởng build production.

---

## 5. Chạy ứng dụng

Mở **hai terminal** riêng biệt:

**Terminal 1 — Backend**

```powershell
cd restaurant_web\be
npm run dev
```

API: `http://localhost:3000`  
WebSocket: `ws://localhost:3000/ws/realtime`

**Terminal 2 — Frontend**

```powershell
cd restaurant_web\vue-fe
npm run dev
```

Truy cập trình duyệt: **http://localhost:5173**

> Vite tự proxy các request `/api/*` sang backend port 3000. Không cần cấu hình CORS thêm khi dev local.

---

## 6. Tài khoản demo

Mật khẩu mặc định cho tất cả tài khoản demo: **`123456`**

### Tài khoản hệ thống (seed cơ bản)

| Tên đăng nhập | Vai trò | Mô tả |
|---------------|---------|-------|
| `admin` | Admin hệ thống | Toàn quyền, không gắn chi nhánh cố định |
| `admin_b1` | Admin | Chi nhánh 1 (Hà Nội — Cầu Giấy) |
| `admin_b2` | Admin | Chi nhánh 5 (TP.HCM — Quận 1) |
| `manager1` | Quản lý | Chi nhánh 1 |
| `waiter1` | Phục vụ | Chi nhánh 1 |
| `kitchen1` | Bếp | Chi nhánh 1 |
| `ngochuy`, `danny`, `adrian` | Khách hàng | Chi nhánh 1 |
| `kimberly`, `sydney`, `debbie` | Khách hàng | Chi nhánh 2 |

### Tài khoản nhân viên theo chi nhánh (7 chi nhánh)

Sau khi chạy `reseed-all.js`, mỗi chi nhánh có thêm nhân viên dạng:

| Pattern username | Vai trò |
|------------------|---------|
| `hl_b{N}_mgr` | Quản lý chi nhánh N |
| `hl_b{N}_w1`, `hl_b{N}_w2` | Phục vụ |
| `hl_b{N}_kit` | Bếp |

Ví dụ: `hl_b1_mgr`, `hl_b3_w1`, `hl_b5_kit` — mật khẩu `123456`.

### Đăng ký tài khoản mới

Truy cập **http://localhost:5173/register** — form có CAPTCHA và giới hạn tần suất để chống spam.

---

## 7. Hướng dẫn sử dụng theo vai trò

### 7.1. Khách hàng (`user`)

| Chức năng | Đường dẫn | Mô tả |
|-----------|-----------|-------|
| Trang chủ | `/` | Giới thiệu, điều hướng nhanh |
| Thực đơn | `/menu` | Xem món theo chi nhánh, lọc danh mục |
| Đặt bàn | `/booking` | Chọn chi nhánh, ngày/giờ, số khách; có thể đặt món trước |
| Chi nhánh | `/branches` | Danh sách chi nhánh, tìm chi nhánh gần |
| Bàn của tôi | `/my-table` | Theo dõi phiên phục vụ, gọi món, yêu cầu thanh toán |
| Tài khoản | `/dashboard` | Lịch sử đặt bàn, đơn hàng |
| Hồ sơ | `/profile` | Cập nhật thông tin cá nhân |
| QR tại bàn | `/t/:token` | Gọi món / xem hóa đơn qua mã QR trên bàn |

**Luồng đặt bàn:**

1. Đăng nhập → vào **Đặt bàn**
2. Chọn chi nhánh, thời gian đến, số khách
3. Hệ thống kiểm tra bàn trống (buffer 2 giờ) và tự gán bàn phù hợp
4. (Tùy chọn) Chọn món đặt trước
5. Xác nhận — nhân viên phục vụ sẽ thấy trên màn **Quản lý bàn**

**Luồng tại bàn:**

1. Nhân viên check-in / gán bàn
2. Khách vào **Bàn của tôi** hoặc quét QR (`/t/:token`)
3. Gọi món → bếp nhận → phục vụ giao món
4. Khách gửi **yêu cầu thanh toán** → nhân viên xác nhận trên hệ thống

### 7.2. Nhân viên phục vụ (`waiter`)

Đăng nhập → tự chuyển tới **Quản lý bàn / Phục vụ** (`/admin/tables`).

| Thao tác | Mô tả |
|----------|-------|
| Xem sơ đồ bàn | Trạng thái: trống, đang phục vụ, chờ dọn, đã đặt trước… |
| Tiếp khách walk-in | Tạo phiên phục vụ cho khách không đặt trước |
| Check-in đặt bàn | Xác nhận khách đến đúng giờ |
| Gọi món | Thêm món vào order của bàn |
| Cập nhật trạng thái món | Đánh dấu "Đã phục vụ" khi giao món |
| Thanh toán | Chọn phương thức (tiền mặt, chuyển khoản, thẻ, ví), xuất hóa đơn PDF |
| Xử lý no-show | Hệ thống tự quét đặt bàn quá hạn mỗi 60 giây |

### 7.3. Nhân viên bếp (`kitchen`)

Đăng nhập → **Bếp** (`/admin/kitchen`).

- Xem hàng đợi món theo chi nhánh
- Cập nhật: **Chờ chế biến** → **Đang chế biến** → **Hoàn thành**
- Thay đổi đồng bộ realtime qua WebSocket tới màn phục vụ

### 7.4. Quản lý chi nhánh (`manager`)

Đăng nhập → **Chi nhánh của tôi** (`/admin/my-branch`).

| Menu | Đường dẫn |
|------|-----------|
| Chi nhánh của tôi | `/admin/my-branch` |
| Quản lý món ăn | `/admin/menu` |
| Báo cáo & Thống kê | `/admin/reports` |
| Quản lý đánh giá | `/admin/reviews` |

- Xem/chỉnh thông tin chi nhánh được phân công
- Quản lý thực đơn (giá, ảnh, trạng thái còn bán)
- Xuất báo cáo doanh thu Excel/PDF, xem món bán chạy

### 7.5. Admin hệ thống (`admin`)

Đăng nhập → **Quản lý nhà hàng** (`/admin`).

| Menu | Đường dẫn |
|------|-----------|
| Dashboard | `/admin` |
| Báo cáo & Thống kê | `/admin/reports` |
| Quản lý đánh giá | `/admin/reviews` |
| Quản lý nhân viên | `/admin/employees` |
| Tài khoản khách | `/admin/customer-accounts` |
| Quản lý chi nhánh | `/admin/branches` |
| Quản lý món ăn | `/admin/menu` |
| Quản lý bàn / Phục vụ | `/admin/tables` |
| Bếp | `/admin/kitchen` |
| Nhật ký thao tác | `/admin/operation-logs` |

Admin có thể chọn phạm vi chi nhánh trên các màn quản trị để lọc dữ liệu.

### 7.6. Sơ đồ luồng nghiệp vụ tổng quát

```
Khách đặt bàn / walk-in
        ↓
Nhân viên check-in & gán bàn
        ↓
Gọi món (khách hoặc phục vụ)
        ↓
Bếp chế biến (WebSocket realtime)
        ↓
Phục vụ giao món → Yêu cầu thanh toán
        ↓
Nhân viên xác nhận thanh toán → Xuất hóa đơn → Bàn chờ dọn
```

---

## 8. Scripts hữu ích

Chạy trong thư mục `be/`:

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Chạy API với nodemon (tự reload) |
| `npm start` | Chạy API production mode |
| `npm run migrate` | Chạy migration nhẹ (idempotent) |
| `npm run test` | Kiểm thử constants trong `shared/` |
| `npm run seed:menu` | Reseed thực đơn tất cả chi nhánh |
| `npm run cleanup:demo-orders` | Dọn các đơn demo đang active |
| `node scripts/reseed-all.js` | Nạp lại toàn bộ dữ liệu demo |
| `node scripts/reseed-menu.js` | Reseed menu (tùy chọn `--branch 1`) |

Chạy trong thư mục `vue-fe/`:

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Dev server + hot reload |
| `npm run build` | Build production vào `dist/` |
| `npm run preview` | Xem thử bản build |

---

## 9. Triển khai production

### Backend

1. Đặt `NODE_ENV=production` trong `.env`
2. Cấu hình `DATABASE_URL` trỏ tới PostgreSQL production
3. Đặt `JWT_SECRET` mạnh, không dùng giá trị mặc định
4. **Không** bật `DB_SYNC_ALTER` trên production
5. Chạy `npm start`

### Frontend

1. Đặt `VITE_API_URL` trỏ tới domain API production
2. `npm run build` — deploy thư mục `dist/`
3. Cấu hình web server (Nginx, Vercel, Railway…) phục vụ static files

---

## 10. Xử lý sự cố

### Không kết nối được database

- Kiểm tra PostgreSQL đang chạy: `docker compose ps`
- Kiểm tra `DATABASE_URL` trong `be/.env` khớp user/password/port/database
- Thử kết nối thủ công: `psql postgres://postgres:postgres@localhost:5432/restaurant`

### Port 3000 đã được sử dụng

```powershell
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

Hoặc đổi `PORT` trong `be/.env`.

### Server báo lỗi JWT_SECRET

`JWT_SECRET` bắt buộc, tối thiểu 16 ký tự. Sửa trong `be/.env` rồi khởi động lại.

### Frontend gọi API sai địa chỉ

- Dev local: đảm bảo có `vue-fe/.env.development.local` với `VITE_API_URL=http://localhost:3000`
- Khởi động lại `npm run dev` sau khi đổi biến môi trường

### Chạy `reseed-all.js` báo lỗi Sequelize config

Tạo file `be/config/config.json` như hướng dẫn ở [Bước 4](#bước-4--tạo-cấu-hình-sequelize-cli-cho-seed-dữ-liệu).

### Bảng chưa tồn tại khi seed

Chạy backend với `DB_SYNC_ALTER=true` một lần trước khi seed (xem [Bước 5](#bước-5--khởi-tạo-database-lần-đầu)).

### Dữ liệu demo bị lẫn / đơn treo

```powershell
cd be
npm run cleanup:demo-orders
# hoặc nạp lại toàn bộ:
node scripts/reseed-all.js
```

### WebSocket / bếp không cập nhật realtime

- Kiểm tra backend đang chạy và log có dòng `WebSocket realtime`
- Refresh trang bếp/phục vụ; đảm bảo cùng chi nhánh
- Kiểm tra firewall không chặn WebSocket trên port 3000

---

## Liên hệ & tài liệu thêm

- Tổng quan kỹ thuật: [README.md](./README.md)
- Tài liệu đồ án chi tiết: thư mục [docs/](./docs/)
