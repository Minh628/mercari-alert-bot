import express from 'express';
import { addKeywordController } from './keyword.controller.js';

const router = express.Router();

// Bắt request POST gửi đến /api/keywords
router.post('/', addKeywordController);

export default router;
