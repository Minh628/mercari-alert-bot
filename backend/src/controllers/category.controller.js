import categoryService from '../services/category.service.js';

// --- GET: Lấy danh sách Category của user hiện tại ---
export const getCategoriesController = async (req, res) => {
    try {
        const userId = req.user.id;
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
        const userId = req.user.id;
        const newCategory = await categoryService.addCategory(userId, req.body);

        return res.status(201).json({
            message: "Thêm Category thành công!",
            category: newCategory,
        });

    } catch (error) {
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
        const userId = req.user.id;
        await categoryService.deleteCategory(req.params.id, userId);

        return res.status(200).json({
            message: "Xóa Category thành công!",
            id: req.params.id
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

// --- UPDATE: Cập nhật Category tìm kiếm theo ID ---
export const updateCategoryController = async (req, res) => {
    try {
        const userId = req.user.id;
        await categoryService.updateCategory(req.params.id, userId, req.body);
        return res.status(200).json({
            message: "Cập nhật Category thành công!",
        });
    } catch (error) {
        if (error.message === "MISSING_ID") {
            return res.status(400).json({ error: "Vui lòng cung cấp ID cần cập nhật!" });
        }
        if (error.message === "NOT_FOUND") {
            return res.status(404).json({ error: "Không tìm thấy Category với ID này!" });
        }
        console.error('[Category] UPDATE error:', error);
        return res.status(500).json({ error: "Lỗi server" });
    }
};

// --- 👑 ADMIN: Xem tất cả Categories của mọi User ---
export const getAllCategoriesAdminController = async (req, res) => {
    try {
        const categories = await categoryService.getAllCategoriesAdmin();
        return res.status(200).json({
            message: "Lấy tất cả Categories thành công!",
            categories
        });
    } catch (error) {
        console.error('[Category] GET ALL (Admin) error:', error);
        return res.status(500).json({ error: "Lỗi server" });
    }
};