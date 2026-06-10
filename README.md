# Mercari Alert Bot

Dự án này là một hệ thống bot tự động cào thông tin (crawler) và cảnh báo sản phẩm trên Mercari dựa trên các từ khóa (keywords) được quản lý bởi người dùng. Dự án được chia làm 2 phần chính: **Backend** (Node.js/Express, Prisma, Playwright) và **Frontend** (React, Vite).

---

## 📁 Cấu trúc thư mục dự án

Dưới đây là cấu trúc chi tiết của dự án dạng cây:

```text
mercari-alert-bot/
├── backend/                             # Mã nguồn Backend (API & Crawler & Telegram Bot)
│   ├── prisma/                          # Cấu hình cơ sở dữ liệu Prisma ORM
│   ├── src/                             # Thư mục chứa mã nguồn chính của Backend
│   │   ├── config/                      # Cấu hình hệ thống
│   │   │   ├── prisma.js                # Khởi tạo kết nối Prisma Client
│   │   │   └── routes.js                # Đăng ký các API routes tập trung
│   │   ├── middlewares/                 # Các Middleware của Express
│   │   │   └── error.middleware.js      # Middleware bắt và xử lý lỗi tập trung
│   │   ├── modules/                     # Các module chức năng theo từng miền nghiệp vụ
│   │   │   ├── crawler/                 # Module cào dữ liệu Mercari
│   │   │   │   └── crawler.services.js  # Logic cào dữ liệu sử dụng Playwright
│   │   │   └── keywords/                # Module quản lý từ khóa tìm kiếm
│   │   │       ├── keyword.controller.js# Controller xử lý request CRUD từ khóa
│   │   │       └── keyword.route.js     # Định nghĩa các endpoints cho từ khóa
│   │   ├── utils/                       # Các hàm/lớp tiện ích dùng chung
│   │   │   └── ApiError.js              # Lớp định nghĩa lỗi API tùy chỉnh (Custom API Error)
│   │   └── app.js                       # Cấu hình Express application
│   ├── .env                             # File cấu hình biến môi trường của Backend (DB URL, Bot token, v.v.)
│   ├── package.json                     # Quản lý dependencies và scripts của Backend
│   └── server.js                        # Điểm khởi chạy (Entry Point) ứng dụng Backend
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

