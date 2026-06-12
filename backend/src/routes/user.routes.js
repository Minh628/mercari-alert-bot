import express from 'express';
import userController from '../controllers/user.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected routes
router.get('/profile', authenticateJWT, userController.getProfile);

// Admin-only routes
router.delete('/:id', authenticateJWT, authorizeRoles('ADMIN'), userController.deleteAccount);

export default router;
