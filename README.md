# Mercari Alert Bot

Dự án này là một hệ thống bot tự động cào thông tin (crawler) và cảnh báo sản phẩm trên Mercari dựa trên các từ khóa (keywords) được quản lý bởi người dùng. Dự án được chia làm 2 phần chính: **Backend** (Node.js/Express, Prisma, Playwright) và **Frontend** (React, Vite).

---

## Folder Structure

Dưới đây là cấu trúc chi tiết của dự án dạng cây:

```text
mercari-alert-bot/
├── backend/                             # Mã nguồn Backend (API & Crawler & Telegram Bot)
│   ├── prisma/                          # Thư mục chứa Schema Prisma ORM
│   │   └── schema.prisma                # Cấu hình DB (Bảng Category, Item, Composite Key)
│   ├── src/                             # Thư mục chứa mã nguồn chính của Backend
│   │   ├── config/                      # Cấu hình hệ thống
│   │   │   ├── prisma.js                # Khởi tạo kết nối Prisma Client
│   │   │   └── routes.js                # Đăng ký các API routes tập trung
│   │   ├── middlewares/                 # Các Middleware của Express
│   │   │   ├── auth.middleware.js       # Xác thực JWT (Authentication)
│   │   │   ├── role.middleware.js       # Phân quyền (Authorization)
│   │   │   ├── expiry.middleware.js     # Kiểm tra tài khoản hết hạn (expiredAt)
│   │   │   └── error.middleware.js      # Middleware bắt và xử lý lỗi tập trung
│   │   ├── controllers/                 # Tầng xử lý Request và trả về Response
│   │   │   ├── user.controller.js       # Controller điều phối cho User (Đăng nhập/Đăng ký/Quản lý)
│   │   │   ├── category.controller.js   # Controller điều phối cho danh mục
│   │   │   └── item.controller.js       # Controller điều phối cho Items đã crawl
│   │   ├── routes/                      # Định nghĩa các API endpoints
│   │   │   ├── user.routes.js           # Routes cho User & Auth
│   │   │   ├── category.routes.js       # Routes cho danh mục
│   │   │   └── item.routes.js           # Routes cho Items
│   │   ├── services/                    # Tầng nghiệp vụ & Các tiến trình chạy nền độc lập
│   │   │   ├── user.service.js          # Service xử lý logic User
│   │   │   ├── category.service.js      # Service thao tác với DB PostgreSQL
│   │   │   ├── item.service.js          # Service quản lý Items (xem, thống kê, dọn dẹp)
│   │   │   ├── itemManager.service.js   # Service quản lý cache và Sliding Window cho Item
│   │   │   └── crawler.service.js       # Cỗ máy Playwright quét dữ liệu & quản lý Event-Driven Cache
│   │   ├── utils/                       # Các hàm/lớp tiện ích dùng chung
│   │   │   └── ApiError.js              # Lớp định nghĩa lỗi API tùy chỉnh (Custom API Error)
│   │   └── app.js                       # Cấu hình Express (Helmet, Rate Limit, Health Check)
│   ├── .env                             # File cấu hình biến môi trường của Backend
│   ├── Dockerfile                       # Cấu hình Docker build Playwright cho Render
│   ├── .dockerignore                    # Bỏ qua các file không đưa vào Docker
│   ├── prisma.config.ts                 # Cấu hình Datasource cho Prisma 7.x
│   ├── package.json                     # Quản lý dependencies và scripts của Backend
│   └── server.js                        # Entry Point + Graceful Shutdown (SIGTERM/SIGINT)
│
└── frontend/                            # Mã nguồn Frontend (Giao diện React)
    ├── public/                          # Chứa tài nguyên tĩnh (static files)
    ├── src/                             # Thư mục mã nguồn chính của Frontend
    │   ├── assets/                      # Hình ảnh, icon và logo của ứng dụng
    │   ├── pages/                       # Các trang chính của giao diện
    │   │   └── Dashboard.jsx            # Trang Dashboard chính hiển thị và quản lý danh sách từ khóa
    │   ├── services/                    # Quản lý gọi API sang Backend
    │   │   └── api.js                   # Cấu hình Axios Instance và định nghĩa các hàm gọi API
    │   ├── App.jsx                      # Component gốc chính của React
    │   ├── main.css                     # Định nghĩa styles CSS toàn cục
    │   └── main.jsx                     # Điểm khởi chạy (Entry Point) của Frontend React
    ├── index.html                       # File HTML chính làm khung chứa React App
    ├── vite.config.js                   # File cấu hình cho Vite bundler
    └── package.json                     # Quản lý dependencies và scripts của Frontend
```

---

## 🛠️ Hướng dẫn cài đặt và chạy ứng dụng

### 1. Chuẩn bị môi trường
Hãy đảm bảo máy tính của bạn đã cài đặt sẵn **Node.js** (khuyến nghị phiên bản LTS mới nhất).

### 2. Cài đặt & Khởi chạy Backend
1. Mở terminal và di chuyển vào thư mục `backend`:
   ```bash
   cd backend
   ```
2. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
3. Tạo file `.env` tại thư mục `/backend` và cấu hình các biến môi trường cần thiết (ví dụ: kết nối Database URL, Telegram Bot Token, ...).
4. Khởi chạy server Backend ở chế độ phát triển (Development):
   ```bash
   npm run dev
   ```
   *Lệnh này sẽ khởi chạy server qua `nodemon` tại cổng đã cấu hình (mặc định nodemon sẽ lắng nghe các thay đổi trong code).*

### 3. Cài đặt & Khởi chạy Frontend
1. Mở một terminal mới và di chuyển vào thư mục `frontend`:
   ```bash
   cd frontend
   ```
2. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
3. Khởi chạy ứng dụng React ở chế độ phát triển (Development) qua Vite:
   ```bash
   npm run dev
   ```
4. Truy cập giao diện ứng dụng thông qua địa chỉ URL được cung cấp trên terminal (thông thường là `http://localhost:5173`).

---

## 📋 Thay đổi gần đây

### [2026-06-14] Nâng cấp Kiến trúc Chịu tải Enterprise
- **FIX**: Xử lý lỗi `400 Bad Request: message is too long` của Telegram bằng cơ chế Cắt tin nhắn (Chunking). Giới hạn mỗi tin nhắn chỉ chứa 20 món hàng, tự động ngắt nghỉ 1s giữa các tin chống block.
- **OPT**: Refactor toàn diện `crawler.service.js`: Chẻ nhỏ siêu hàm `startCrawlerLoop` thành các module độc lập `scanSingleCategory` và `sendBatchTelegram`, tối ưu hóa hiệu suất và dễ bảo trì.
- **FIX**: Xử lý triệt để lỗi Closure Leak & Race Condition: Bỏ hoàn toàn `page.on`, chuyển sang cơ chế Đồng bộ cục bộ (`waitForResponse`). Đảm bảo không bao giờ gửi nhầm khách hàng và không miss item.
- **FEAT**: Áp dụng cơ chế **Khởi động nguội (Cold Start)**: Tự động xóa RAM khi Pause (`isActive=false`). Lượt quét tiếp theo sẽ coi là mốc khởi điểm và hoàn toàn im lặng, không spam Telegram.
- **FEAT**: Triển khai cơ chế **Gom mẻ (Batching)**: Gom tất cả items mới trong 1 lượt cào thành 1 tin nhắn tổng hợp. Chống Rate Limit 429 tuyệt đối cho các từ khóa "siêu nóng" (10s/5 món).


## 🚀 Hướng dẫn Deploy Lên Production

### 1. Deploy Backend Lên Render (Web Service)
Backend được đóng gói sẵn Docker để xử lý vấn đề OS dependencies của Playwright.
1. Vào Render Dashboard, tạo mới **Web Service**.
2. Kết nối repo Github.
3. Chọn thư mục root là `backend/`.
4. Mục **Environment**: Chọn `Docker`.
5. Thiết lập biến môi trường (Environment Variables):
   - `DATABASE_URL`: Link kết nối tới Database Postgres (Neon, Supabase...).
   - `TELEGRAM_TOKEN`: Token bot Telegram của bạn.
   - `JWT_SECRET`: Chuỗi bảo mật ngẫu nhiên.
6. Render sẽ tự động build `Dockerfile`, cài thư viện OS, Playwright Chromium và khởi chạy.

### 2. Deploy Frontend Lên Vercel
1. Vào Vercel, tạo Project mới và kết nối Repo Github.
2. Root Directory: Chọn thư mục `frontend/`.
3. Framework Preset: Để mặc định `Vite`.
4. Biến môi trường (Environment Variables):
   - Bắt buộc thêm biến `VITE_API_URL` trỏ tới đường link Backend bạn vừa lấy được từ Render (Ví dụ: `https://mercari-backend.onrender.com/api`).
5. Deploy.

---

## 🔌 API Endpoints

> Ký hiệu quyền: 🔓 Public | 🔑 JWT (ADMIN & MEMBER) | 👑 Admin Only | 👤 Owner Only

### 1. User & Authentication (`/api/users`)
| Method | Endpoint | Quyền | Mô tả | Body |
|--------|----------|-------|-------|------|
| `POST` | `/login` | 🔓 | Đăng nhập & Lấy JWT | `{ username, password }` |
| `GET` | `/profile` | 🔑 | Xem profile bản thân | — |
| `PATCH` | `/profile` | 🔑👤 | Tự đổi password / telegramId | `{ password?, telegramId? }` |
| `POST` | `/` | 👑 | Admin tạo tài khoản mới | `{ username, password, telegramId?, role?, expiredAt? }` |
| `GET` | `/` | 👑 | Admin xem danh sách tất cả Users | — |
| `PUT` | `/:id` | 👑 | Admin sửa thông tin User | `{ password?, telegramId?, role?, expiredAt? }` |
| `DELETE` | `/:id` | 👑 | Admin xóa User | — |

### 2. Categories (`/api/categories`)
| Method | Endpoint | Quyền | Mô tả | Body |
|--------|----------|-------|-------|------|
| `GET` | `/` | 🔑 | Lấy danh sách Category của mình | — |
| `POST` | `/` | 🔑 | Thêm Category tìm kiếm mới | `{ categoryId, itemConditionId?, status?, brandId?, priceMin?, priceMax?, isActive? }` |
| `PUT` | `/:id` | 🔑 | Cập nhật Category (chỉ của mình) | `{ ...các trường cần sửa }` |
| `DELETE` | `/:id` | 🔑 | Xóa Category (chỉ của mình) | — |
| `GET` | `/all` | 👑 | Admin xem tất cả Categories của mọi User | — |

### 3. Items (`/api/items`)
| Method | Endpoint | Quyền | Mô tả | Query |
|--------|----------|-------|-------|-------|
| `GET` | `/:categoryId` | 🔑 | Xem Items của 1 Category mình sở hữu | — |
| `GET` | `/stats` | 👑 | Admin xem thống kê Items | — |
| `DELETE` | `/cleanup` | 👑 | Admin dọn dẹp Items cũ | `?days=7` |

### 4. Health Check
| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| `GET` | `/health` | 🔓 | Kiểm tra server còn sống (dùng UptimeRobot ping chống Render Sleep) |
