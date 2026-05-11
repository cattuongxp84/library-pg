# 🏪 POS Retail - Phần mềm quản lý bán hàng offline

**Stack:** Node.js + Express + Sequelize + PostgreSQL + React

Phần mềm quản lý bán hàng offline dành cho cửa hàng bán lẻ. Dữ liệu lưu trực tiếp trên PostgreSQL, có thể lưu lên đám mây. Offline hoặc online đều vẫn bán hàng, in hóa đơn, quản lý kho và công nợ.

---

## ✨ Tính năng chính

| Tính năng | Mô tả |
|-----------|--------|
| **Bán hàng (POS)** | Giao diện bán hàng nhanh, tìm sản phẩm, quét barcode, tính tiền tự động |
| **Quản lý sản phẩm** | CRUD sản phẩm, danh mục, SKU, barcode, giá vốn/giá bán |
| **Quản lý kho** | Nhập kho, kiểm kê tồn, cảnh báo sắp hết hàng |
| **Quản lý khách hàng** | Danh sách KH, lịch sử mua hàng, công nợ |
| **Quản lý nhà cung cấp** | Danh sách NCC, phiếu nhập, công nợ |
| **Công nợ** | Theo dõi nợ KH/NCC, thanh toán nợ, lịch sử giao dịch |
| **In hóa đơn** | In hóa đơn PDF (hỗ trợ máy in bill) |
| **Báo cáo** | Doanh thu theo ngày/tháng, sản phẩm bán chạy |
| **Offline/Online** | Hoạt động không cần internet, sync lên cloud khi có mạng |

---

## ⚙️ Yêu cầu hệ thống

- **Node.js** >= 16
- **PostgreSQL** >= 13
- **npm** >= 8

---

## 🚀 Cài đặt

### 1. Tạo database

```bash
createdb pos_retail_db
# Hoặc:
psql -U postgres -c "CREATE DATABASE pos_retail_db;"
```

### 2. Cài dependencies

```bash
cd pos-retail
npm run install:all
```

### 3. Cấu hình

```bash
cd server
cp .env.example .env
# Chỉnh sửa .env theo môi trường của bạn
```

### 4. Seed dữ liệu demo

```bash
npm run seed
```

### 5. Chạy ứng dụng

```bash
npm run dev
```

- **Frontend:** http://localhost:3003
- **Backend API:** http://localhost:5002/api

---

## 👤 Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---------|-------|-----------|
| Admin | admin@pos.com | 123456 |
| Nhân viên | staff@pos.com | 123456 |

---

## 📁 Cấu trúc

```
pos-retail/
├── server/
│   ├── config/db.js         # Kết nối PostgreSQL
│   ├── models/index.js      # Tất cả models + associations
│   ├── controllers/         # Logic xử lý
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   ├── customerController.js
│   │   ├── supplierController.js
│   │   ├── stockController.js
│   │   ├── debtController.js
│   │   ├── reportController.js
│   │   ├── invoiceController.js
│   │   └── syncController.js
│   ├── middleware/auth.js
│   ├── routes/index.js
│   ├── index.js
│   └── seed.js
├── client/
│   ├── public/
│   └── src/
│       ├── components/Layout.js
│       ├── context/AuthContext.js
│       ├── pages/
│       │   ├── LoginPage.js
│       │   ├── DashboardPage.js
│       │   ├── POSPage.js
│       │   ├── ProductsPage.js
│       │   ├── OrdersPage.js
│       │   ├── CustomersPage.js
│       │   ├── SuppliersPage.js
│       │   ├── InventoryPage.js
│       │   ├── DebtsPage.js
│       │   └── ReportsPage.js
│       ├── services/api.js
│       └── utils/format.js
└── package.json
```

---

## 🔌 Cloud PostgreSQL

Hỗ trợ kết nối cloud PostgreSQL (Supabase, Railway, Neon, ...) bằng cách thay đổi `.env`:

```env
DB_HOST=db.xxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password
```

---

## 🔄 Sync Offline/Online

- Khi offline: Dữ liệu lưu vào PostgreSQL local
- Khi có mạng: Gọi API `/api/sync/export` để xuất dữ liệu
- Import dữ liệu từ cloud: Gọi API `/api/sync/import`
- Kiểm tra đơn chưa sync: `/api/sync/unsynced`

---

## 📋 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | /api/auth/login | Đăng nhập |
| GET | /api/products | Danh sách sản phẩm |
| POST | /api/orders | Tạo đơn hàng (POS) |
| GET | /api/orders | Danh sách đơn hàng |
| GET | /api/invoices/:id/pdf | In hóa đơn PDF |
| POST | /api/stock/imports | Nhập kho |
| GET | /api/stock/inventory | Báo cáo tồn kho |
| GET | /api/debts/summary | Tổng hợp công nợ |
| GET | /api/reports/dashboard | Dashboard tổng quan |
| GET | /api/reports/revenue | Báo cáo doanh thu |
| GET | /api/sync/export | Xuất dữ liệu sync |
