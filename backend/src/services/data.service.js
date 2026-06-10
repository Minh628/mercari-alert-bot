import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lưu file data.json ở thư mục gốc của backend
const DATA_FILE_PATH = path.join(__dirname, '../../../data.json');

// Mảng chứa các cấu hình tìm kiếm Category trên RAM (Hybrid)
export let inMemoryCategories = [];

/**
 * Đọc categories từ file lên RAM khi khởi động
 */
export const loadCategories = () => {
    try {
        if (fs.existsSync(DATA_FILE_PATH)) {
            const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed.categories)) {
                inMemoryCategories = parsed.categories;
            }
        }
        console.log(`📂 [Data Service] Đã tải ${inMemoryCategories.length} cấu hình tìm kiếm vào bộ nhớ.`);
    } catch (error) {
        console.error('Lỗi khi đọc file data.json:', error);
    }
};

/**
 * Lưu categories từ RAM xuống file (khi có thay đổi)
 */
export const saveCategories = (categoriesArray) => {
    try {
        const data = JSON.stringify({ categories: categoriesArray }, null, 2);
        fs.writeFileSync(DATA_FILE_PATH, data, 'utf8');
        inMemoryCategories = [...categoriesArray]; // Đồng bộ RAM
    } catch (error) {
        console.error('Lỗi khi lưu file data.json:', error);
    }
};

/**
 * Tạo ID ngắn gọn duy nhất cho mỗi category config
 */
export const generateId = () => crypto.randomUUID().slice(0, 8);

// Gọi ngay khi module được import để nạp dữ liệu ban đầu
loadCategories();

