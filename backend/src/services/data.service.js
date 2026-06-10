import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lưu file data.json ở thư mục gốc của backend
const DATA_FILE_PATH = path.join(__dirname, '/../../data.json');

// Mảng chứa từ khóa trên RAM (Hybrid)
export let inMemoryKeywords = [];

/**
 * Đọc từ khóa từ file lên RAM khi khởi động
 */
export const loadKeywords = () => {
    try {
        if (fs.existsSync(DATA_FILE_PATH)) {
            const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed.keywords)) {
                inMemoryKeywords = parsed.keywords;
            }
        }
        console.log(`📂 [Data Service] Đã tải ${inMemoryKeywords.length} từ khóa vào bộ nhớ.`);
    } catch (error) {
        console.error('Lỗi khi đọc file data.json:', error);
    }
};

/**
 * Lưu từ khóa từ RAM xuống file (khi có thay đổi)
 */
export const saveKeywords = (keywordsArray) => {
    try {
        const data = JSON.stringify({ keywords: keywordsArray }, null, 2);
        fs.writeFileSync(DATA_FILE_PATH, data, 'utf8');
        inMemoryKeywords = [...keywordsArray]; // Đồng bộ RAM
    } catch (error) {
        console.error('Lỗi khi lưu file data.json:', error);
    }
};

// Gọi ngay khi module được import để nạp dữ liệu ban đầu
loadKeywords();
