import * as categoryModel from '../models/category.model.js';

// --- GET: Lấy danh sách Category tìm kiếm ---
export const getCategoriesController = (req, res) => {
    try {
        // Lấy dữ liệu thông qua Model, Controller không còn biết chi tiết RAM/File
        const categories = categoryModel.getAllCategories();
        return res.status(200).json({
            message: "Lấy danh sách thành công!",
            categories
        });
    } catch (error) {
        return res.status(500).json({ error: "Lỗi server" });
    }
};

// --- ADD: Thêm Category tìm kiếm mới ---
export const addCategoryController = (req, res) => {
    try {
        const { category_id, item_condition_id, status, brand_id, price_min, price_max } = req.body;

        // Validate bắt buộc: category_id
        if (!category_id) {
            return res.status(400).json({ error: "Vui lòng cung cấp category_id!" });
        }

        // Tạo object Category tìm kiếm mới
        const newCategory = {
            id: categoryModel.generateId(),
            category_id: String(category_id),
            // Các trường tùy chọn - chỉ lưu nếu có giá trị
            ...(item_condition_id && { item_condition_id: String(item_condition_id) }),
            ...(status && { status }),
            ...(brand_id && { brand_id: String(brand_id) }),
            ...(price_min != null && { price_min: Number(price_min) }),
            ...(price_max != null && { price_max: Number(price_max) }),
        };

        // Thêm category thông qua Model
        const addedCategory = categoryModel.addCategory(newCategory);

        return res.status(200).json({
            message: "Thêm Category thành công!",
            category: addedCategory,
            categories: categoryModel.getAllCategories()
        });

    } catch (error) {
        return res.status(500).json({ error: "Lỗi server" });
    }
};

// --- DELETE: Xóa Category tìm kiếm theo ID ---
export const deleteCategoryController = (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: "Vui lòng cung cấp ID cần xóa!" });
        }

        // Ủy quyền xóa cho Model
        const isDeleted = categoryModel.deleteCategory(id);

        if (!isDeleted) {
            return res.status(404).json({ error: "Không tìm thấy Category với ID này!" });
        }

        return res.status(200).json({
            message: "Xóa Category thành công!",
            categories: categoryModel.getAllCategories()
        });
    } catch (error) {
        return res.status(500).json({ error: "Lỗi server" });
    }
};
