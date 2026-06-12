import express from 'express';
import itemController from '../controllers/item.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { checkExpiry } from '../middlewares/expiry.middleware.js';

const router = express.Router();

// Tất cả routes item đều yêu cầu đăng nhập + kiểm tra hạn sử dụng
router.use(authenticateJWT);
router.use(checkExpiry);

// 👑 Admin routes (đặt TRƯỚC /:categoryId để Express không nhầm "stats"/"cleanup" là categoryId)
router.get('/stats', authorizeRoles('ADMIN'), itemController.getStats);
router.delete('/cleanup', authorizeRoles('ADMIN'), itemController.cleanup);

// 🔑 Member: Xem items của 1 category mà mình sở hữu
router.get('/:categoryId', itemController.getItemsByCategory);

export default router;
