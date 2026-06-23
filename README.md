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
│   │   ├── modules/                     # Tầng Module chứa các tính năng độc lập (Feature-driven)
│   │   │   ├── user/                    # Module User (Đăng nhập/Đăng ký/Quản lý)
│   │   │   │   ├── user.controller.js
│   │   │   │   ├── user.routes.js
│   │   │   │   └── user.service.js
│   │   │   ├── category/                # Module Category (Quản lý cấu hình tìm kiếm)
│   │   │   │   ├── category.controller.js
│   │   │   │   ├── category.routes.js
│   │   │   │   └── category.service.js
│   │   │   ├── item/                    # Module Item (Quản lý các items đã cào)
│   │   │   │   ├── item.controller.js
│   │   │   │   ├── item.routes.js
│   │   │   │   └── item.service.js
│   │   │   └── crawler/                 # Module Crawler & Telegram Bot
│   │   │       ├── crawler.service.js   # Cỗ máy Playwright quét dữ liệu & Cache
│   │   │       ├── itemManager.service.js # Quản lý Sliding Window cho Item
│   │   │       └── telegramBot.service.js # Bot gửi thông báo Telegram
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
└── frontend/                            # Mã nguồn Frontend (React + Vite)
    ├── public/                          # Chứa tài nguyên tĩnh (static files)
    ├── src/                             # Thư mục mã nguồn chính của Frontend
    │   ├── components/                  # Các Reusable Components (Kiến trúc Colocation .jsx đi kèm .scss)
    │   │   ├── common/                  # Component nhỏ lẻ (Button, Card, InputField, ToggleSwitch...)
    │   │   └── layout/                  # Khung sườn giao diện (Sidebar, Header, MainLayout)
    │   ├── pages/                       # Các màn hình chính phân theo Router
    │   │   └── Dashboard/               # Dashboard với các Tab (WelcomeTab, CategoryTab, KeywordTab...)
    │   ├── styles/                      # Global Styles & Variables (Root Colors, Neon Mixins)
    │   │   ├── _variables.scss          # Biến SCSS toàn cục
    │   │   └── main.scss                # File CSS gốc chứa Reset & Import Variables
    │   ├── services/                    # Gọi API Backend (Axios/Fetch)
    │   │   └── api.js                   
    │   ├── App.jsx                      # Component gốc thiết lập Routes
    │   └── main.jsx                     # Điểm khởi chạy (Entry Point)
    ├── index.html                       # File HTML gốc
    ├── vite.config.js                   # Cấu hình cho Vite bundler
    └── package.json                     # Quản lý thư viện Frontend
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
