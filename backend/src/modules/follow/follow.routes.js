import express from 'express';
import { getFollowsController, addFollowController, deleteFollowController, updateFollowController, getAllFollowsAdminController } from './follow.controller.js';
import { authenticateJWT } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { checkExpiry } from '../../middlewares/expiry.middleware.js';

const router = express.Router();

// Tất cả routes follow đều yêu cầu đăng nhập + kiểm tra hạn sử dụng
router.use(authenticateJWT);
router.use(checkExpiry);

// GET  /api/follows       - Lấy danh sách cấu hình của user hiện tại
router.get('/', getFollowsController);
// POST /api/follows       - Thêm cấu hình tìm kiếm mới
router.post('/', addFollowController);
// PUT /api/follows/:id    - Cập nhật cấu hình theo ID
router.put('/:id', updateFollowController);
// DELETE /api/follows/:id - Xóa cấu hình theo ID
router.delete('/:id', deleteFollowController);

// 👑 Admin: Xem tất cả follows của mọi user
router.get('/all', authorizeRoles('ADMIN'), getAllFollowsAdminController);

export default router;
