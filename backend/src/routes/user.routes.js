import express from 'express';
import userController from '../controllers/user.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';

const router = express.Router();

// ===== 🔓 Public routes =====
router.post('/login', userController.login);

// ===== 🔑 Authenticated routes (ADMIN & MEMBER) =====
// Member tự đổi password / telegramId (PATCH trước GET để Express match đúng)
router.patch('/profile', authenticateJWT, userController.updateSelfProfile);
// Xem profile bản thân
router.get('/profile', authenticateJWT, userController.getProfile);

// ===== 👑 Admin-only routes =====
// Admin tạo tài khoản mới
router.post('/', authenticateJWT, authorizeRoles('ADMIN'), userController.register);
// Admin xem danh sách tất cả Users
router.get('/', authenticateJWT, authorizeRoles('ADMIN'), userController.getAllUsers);
// Admin sửa thông tin User bất kỳ
router.put('/:id', authenticateJWT, authorizeRoles('ADMIN'), userController.updateUser);
// Admin xóa User
router.delete('/:id', authenticateJWT, authorizeRoles('ADMIN'), userController.deleteAccount);

export default router;
