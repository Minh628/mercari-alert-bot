import { inMemoryCategories, saveCategories, generateId } from '../../services/data.service.js';

// --- GET: Lấy danh sách cấu hình tìm kiếm ---
export const getCategoriesController = (req, res) => {
    try {
        return res.status(200).json({
            message: "Lấy danh sách thành công!",
            categories: inMemoryCategories
        });
    } catch (error) {
        return res.status(500).json({ error: "Lỗi server" });
    }
};

// --- ADD: Thêm cấu hình tìm kiếm mới ---
export const addCategoryController = (req, res) => {
    try {
        const { name, category_id, item_condition_id, status, brand_id, price_min, price_max } = req.body;

        // Validate bắt buộc: category_id
        if (!category_id) {
            return res.status(400).json({ error: "Vui lòng cung cấp category_id!" });
        }

        // Tạo object cấu hình tìm kiếm mới
        const newCategory = {
            id: generateId(),
            name: name || `Category ${category_id}`,
            category_id: String(category_id),
            // Các trường tùy chọn - chỉ lưu nếu có giá trị
            ...(item_condition_id && { item_condition_id: String(item_condition_id) }),
            ...(status && { status }),
            ...(brand_id && { brand_id: String(brand_id) }),
            ...(price_min != null && { price_min: Number(price_min) }),
            ...(price_max != null && { price_max: Number(price_max) }),
        };

        const updatedCategories = [...inMemoryCategories, newCategory];
        saveCategories(updatedCategories);

        return res.status(200).json({
            message: "Thêm cấu hình tìm kiếm thành công!",
            category: newCategory,
            categories: inMemoryCategories
        });

    } catch (error) {
        return res.status(500).json({ error: "Lỗi server" });
    }
};

// --- DELETE: Xóa cấu hình tìm kiếm theo ID ---
export const deleteCategoryController = (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: "Vui lòng cung cấp ID cần xóa!" });
        }

        const updatedCategories = inMemoryCategories.filter(c => c.id !== id);

        // Kiểm tra xem có xóa được gì không
        if (updatedCategories.length === inMemoryCategories.length) {
            return res.status(404).json({ error: "Không tìm thấy cấu hình với ID này!" });
        }

        saveCategories(updatedCategories);

        return res.status(200).json({
            message: "Xóa cấu hình thành công!",
            categories: inMemoryCategories
        });
    } catch (error) {
        return res.status(500).json({ error: "Lỗi server" });
    }
};
