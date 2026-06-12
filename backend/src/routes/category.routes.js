import express from 'express';
import { getCategoriesController, addCategoryController, deleteCategoryController, updateCategoryController } from '../controllers/category.controller.js';

const router = express.Router();

// GET  /api/categories       - Lấy danh sách cấu hình tìm kiếm
router.get('/', getCategoriesController);
// POST /api/categories       - Thêm cấu hình tìm kiếm mới
router.post('/', addCategoryController);
// DELETE /api/categories/:id - Xóa cấu hình theo ID
router.delete('/:id', deleteCategoryController);
// Update /api/categories/:id - Cập nhật cấu hình theo ID
router.put('/:id', updateCategoryController);

export default router;
