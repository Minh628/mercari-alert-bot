import express from 'express';
import { verifyCronSecret } from '../../middlewares/cron.middleware.js';


const router = express.Router();

/**
 * Route chuyên dụng cho cron-job.org
 * GET /api/cron/ping
 * Yêu cầu Header: x-cron-secret
 */
router.get('/ping', verifyCronSecret, (req, res) => {
    // Cron-job.org gọi vào đây để giữ server Render không bị sleep
    // Bạn cũng có thể kích hoạt 1 số task dọn dẹp RAM tại đây nếu cần
    

    res.status(200).json({
        success: true,
        message: 'Cron-job ping nhận được thành công, server đang thức!',
        timestamp: new Date().toISOString()
    });
});

export default router;
