import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lưu file data.json ở thư mục gốc của backend
// Vì file model này nằm ở src/models/ nên back ra 3 cấp
const DATA_FILE_PATH = path.join(__dirname, '../../data.json');

// Mảng chứa các cấu hình tìm kiếm Category trên RAM (Hybrid)
// Đóng gói bên trong module, không export trực tiếp để bảo vệ tính toàn vẹn (MVC Model)
let inMemoryCategories = [];

/**
 * Đọc categories từ file lên RAM khi khởi động
 */
const loadCategories = () => {
    try {
        if (fs.existsSync(DATA_FILE_PATH)) {
            const data = fs.readFileSync(DATA_FILE_PATH, 'utf8');
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed.categories)) {
                inMemoryCategories = parsed.categories;
            }
        }
        console.log(`📂 [Category Model] Đã tải ${inMemoryCategories.length} Category tìm kiếm vào bộ nhớ.`);
    } catch (error) {
        console.error('Lỗi khi đọc file data.json:', error);
    }
};

/**
 * Lưu categories từ RAM xuống file (khi có thay đổi)
 */
const saveCategories = (categoriesArray) => {
    try {
        const data = JSON.stringify({ categories: categoriesArray }, null, 2);
        fs.writeFileSync(DATA_FILE_PATH, data, 'utf8');
        inMemoryCategories = [...categoriesArray]; // Đồng bộ RAM
    } catch (error) {
        console.error('Lỗi khi lưu file data.json:', error);
    }
};

// Gọi ngay khi module được import để nạp dữ liệu ban đầu
loadCategories();

/**
 * Tạo ID ngắn gọn duy nhất cho mỗi category config
 */
export const generateId = () => crypto.randomUUID().slice(0, 8);

/**
 * Lấy danh sách toàn bộ Category hiện có
 * Cung cấp hàm getter để các module khác (như Crawler) gọi an toàn.
 */
export const getAllCategories = () => {
    return inMemoryCategories;
};

/**
 * Thêm một Category mới và tự động lưu vào file
 */
export const addCategory = (newCategory) => {
    const updatedCategories = [...inMemoryCategories, newCategory];
    saveCategories(updatedCategories);
    return newCategory;
};

/**
 * Xóa một Category theo ID
 * Trả về true nếu xóa thành công, false nếu không tìm thấy.
 */
export const deleteCategory = (id) => {
    const updatedCategories = inMemoryCategories.filter(c => c.id !== id);
    if (updatedCategories.length === inMemoryCategories.length) {
        return false; // Không có gì bị xóa
    }
    saveCategories(updatedCategories);
    return true; // Đã xóa
};
