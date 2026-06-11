import * as categoryService from '../services/category.service.js';

// TODO: Thay bằng userId thật từ Auth middleware khi hoàn thành hệ thống đăng nhập
const TEMP_USER_ID = 1;

// --- GET: Lấy danh sách Category tìm kiếm ---
export const getCategoriesController = async (req, res) => {
    try {
        const userId = req.user?.id || TEMP_USER_ID;
        const categories = await categoryService.getAllCategories(userId);
        return res.status(200).json({
            message: "Lấy danh sách thành công!",
            categories
        });
    } catch (error) {
        console.error('[Category] GET error:', error);
        return res.status(500).json({ error: "Lỗi server" });
    }
};

// --- ADD: Thêm Category tìm kiếm mới ---
export const addCategoryController = async (req, res) => {
    try {
        const userId = req.user?.id || TEMP_USER_ID;
        // Ủy quyền toàn bộ xử lý nghiệp vụ cho Service
        const newCategory = await categoryService.addCategory(userId, req.body);

        // Lấy lại danh sách mới nhất sau khi thêm
        const categories = await categoryService.getAllCategories(userId);

        return res.status(201).json({
            message: "Thêm Category thành công!",
            category: newCategory,
            categories
        });

    } catch (error) {
        // Xử lý các exception ném ra từ Service
        if (error.message === "MISSING_CATEGORY_ID") {
            return res.status(400).json({ error: "Vui lòng cung cấp category_id!" });
        }
        console.error('[Category] POST error:', error);
        return res.status(500).json({ error: "Lỗi server" });
    }
};

// --- DELETE: Xóa Category tìm kiếm theo ID ---
export const deleteCategoryController = async (req, res) => {
    try {
        const userId = req.user?.id || TEMP_USER_ID;
        await categoryService.deleteCategory(req.params.id, userId);

        // Lấy lại danh sách sau khi xóa
        const categories = await categoryService.getAllCategories(userId);

        return res.status(200).json({
            message: "Xóa Category thành công!",
            categories
        });
    } catch (error) {
        if (error.message === "MISSING_ID") {
            return res.status(400).json({ error: "Vui lòng cung cấp ID cần xóa!" });
        }
        if (error.message === "NOT_FOUND") {
            return res.status(404).json({ error: "Không tìm thấy Category với ID này!" });
        }
        console.error('[Category] DELETE error:', error);
        return res.status(500).json({ error: "Lỗi server" });
    }
};
