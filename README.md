# Restaurant Web — Hệ thống quản lý nhà hàng đa chi nhánh

Ứng dụng full-stack cho đặt bàn, gọi món, bếp, thanh toán và quản trị chi nhánh.

## Cấu trúc dự án

```
restaurant_web/
├── shared/      # Constants & pure helpers dùng chung FE + BE
├── be/          # Backend API (Express + Sequelize + PostgreSQL)
├── vue-fe/      # Frontend SPA (Vue 3 + Vite + Element Plus)
└── docs/        # Tài liệu đồ án (LaTeX, diagram)
```

### Shared (`shared/`)

| File | Nội dung |
|------|----------|
| `orderStatus.js` | Trạng thái đơn/phiên (8 giá trị) |
| `tableStatus.js` | Trạng thái bàn (UC10) |
| `branchHours.js` | Giờ mở cửa, validate đặt bàn |
| `branchDisplay.js` | Tách tên nhà hàng / chi nhánh |

FE import qua alias `@shared/...`, BE import qua `require('../../shared/...')`.

### Backend (`be/`)

| Thư mục | Vai trò |
|---------|---------|
| `controllers/` | Xử lý HTTP request/response |
| `services/` | Logic nghiệp vụ |
| `models/` | Sequelize models + kết nối DB |
| `routes/` | Định tuyến API (`/api/...`) |
| `middlewares/` | Auth, rate limit, validation, operation log |
| `utils/` | Helpers dùng chung (orderStatus, branchHours, …) |
| `scripts/` | Migration, reseed, cleanup |
| `seeders/` | Dữ liệu demo |

### Frontend (`vue-fe/src/`)

```
src/
├── features/           # Module theo domain (ưu tiên thêm code mới ở đây)
│   ├── admin/
│   │   ├── shared/     # AdminBranchSelect, useAdminBranchScope
│   │   ├── tables/     # Quản lý bàn (page, dialogs, composables)
│   │   └── operation-logs/
│   └── menu/           # Thực đơn public + admin
├── views/              # Route shells (thin wrappers)
├── components/         # UI dùng chung toàn app
├── composables/        # Re-export → features (backward compat)
├── router/
│   ├── guards.js
│   └── routes/         # public.js, admin.js
├── constants/          # Re-export từ @shared + nhãn UI
└── utils/
```

| Thư mục | Vai trò |
|---------|---------|
| `features/` | Logic + UI theo domain (tables, menu, logs…) |
| `views/` | Entry route mỏng, delegate sang `features/` |
| `components/` | BillSummary, PaginationBar, Navbar… |
| `constants/` | Trạng thái đơn/bàn (đồng bộ `shared/`) |

## Yêu cầu

- Node.js 18+
- PostgreSQL 14+

## Chạy local

### 0. PostgreSQL (Docker — tùy chọn)

```bash
docker compose up -d
# DATABASE_URL=postgres://postgres:postgres@localhost:5432/restaurant
```

### 1. Backend

```bash
cd be
cp .env.example .env
# Sửa DATABASE_URL và JWT_SECRET trong .env
npm install
npm run dev
```

API chạy tại `http://localhost:3000`. WebSocket realtime: `ws://localhost:3000/ws/realtime`.

### 2. Frontend

```bash
cd vue-fe
npm install
npm run dev
```

Vite proxy API tới backend (mặc định port 5173).

## Scripts hữu ích

| Lệnh | Mô tả |
|------|-------|
| `be npm run test` | Test constants trong `shared/` |
| `be npm run migrate` | Chạy migration nhẹ (idempotent) |
| `be npm run seed:menu` | Reseed menu |
| `be npm run cleanup:demo-orders` | Dọn đơn demo đang active |
| `vue-fe npm run build` | Build production |

## Ghi chú kỹ thuật

- Schema DB được cập nhật qua `be/scripts/applyMigrations.js` (tự chạy khi start server).
- Constants trạng thái đơn: `be/utils/orderStatus.js` ↔ `vue-fe/src/constants/orderStatus.js`.
- Upload ảnh lưu tại `be/uploads/`.
