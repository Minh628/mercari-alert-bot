import express from 'express';
import { getCategoriesController, addCategoryController, deleteCategoryController, updateCategoryController, getAllCategoriesAdminController } from './category.controller.js';
import { authenticateJWT } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { checkExpiry } from '../../middlewares/expiry.middleware.js';

const router = express.Router();

// Tất cả routes category đều yêu cầu đăng nhập + kiểm tra hạn sử dụng
router.use(authenticateJWT);
router.use(checkExpiry);

// GET  /api/categories       - Lấy danh sách cấu hình của user hiện tại
router.get('/', getCategoriesController);
// POST /api/categories       - Thêm cấu hình tìm kiếm mới
router.post('/', addCategoryController);
// PUT /api/categories/:id    - Cập nhật cấu hình theo ID
router.put('/:id', updateCategoryController);
// DELETE /api/categories/:id - Xóa cấu hình theo ID
router.delete('/:id', deleteCategoryController);

// 👑 Admin: Xem tất cả categories của mọi user
router.get('/all', authorizeRoles('ADMIN'), getAllCategoriesAdminController);

export default router;
