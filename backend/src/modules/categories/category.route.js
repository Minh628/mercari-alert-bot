import express from 'express';
import { getCategoriesController, addCategoryController, deleteCategoryController } from './category.controller.js';

const router = express.Router();

// GET  /api/categories       - Lấy danh sách cấu hình tìm kiếm
router.get('/', getCategoriesController);
// POST /api/categories       - Thêm cấu hình tìm kiếm mới
router.post('/', addCategoryController);
// DELETE /api/categories/:id - Xóa cấu hình theo ID
router.delete('/:id', deleteCategoryController);

export default router;
