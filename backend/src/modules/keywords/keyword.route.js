import express from 'express';
import { addKeywordController, getKeywordsController, deleteKeywordController } from './keyword.controller.js';

const router = express.Router();

router.get('/', getKeywordsController);
router.post('/', addKeywordController);
router.delete('/:keyword', deleteKeywordController);

export default router;
