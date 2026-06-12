# Sử dụng base image Node.js gọn nhẹ
FROM node:20-bookworm-slim

# Cài đặt các thư viện hệ thống cần thiết cơ bản
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy các file cấu hình package vào trước để tận dụng cache của Docker
COPY package*.json ./

# Cài đặt toàn bộ dependencies (bao gồm playwright)
RUN npm install

# 🚀 QUAN TRỌNG: Lệnh này tự động tải Chromium và cài toàn bộ OS dependencies cần thiết cho Playwright
RUN npx playwright install --with-deps chromium

# Copy toàn bộ mã nguồn còn lại vào container
COPY . .

# Generate Prisma Client (Rất quan trọng khi chạy trong Docker)
RUN npx prisma generate

# Mở cổng 3000 cho Render
EXPOSE 3000

# Lệnh khởi chạy server bằng Node.js (không dùng nodemon trên production)
CMD ["npm", "start"]
