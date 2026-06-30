import ApiError from '../utils/ApiError.js';

/**
 * Middleware bảo vệ các route dành riêng cho cron-job.org
 * Yêu cầu phải gửi header x-cron-secret khớp với biến môi trường CRON_SECRET_KEY
 */
export const verifyCronSecret = (req, res, next) => {
    const cronSecret = req.headers['x-cron-secret'];
    const envCronSecret = process.env.CRON_SECRET_KEY;

    // Nếu server không cấu hình CRON_SECRET_KEY, có thể tạm thời block hoặc pass (tuỳ nhu cầu).
    // Ở đây ta mặc định nếu chưa cấu hình thì không cho ai chạy để đảm bảo an toàn.
    if (!envCronSecret) {
        return next(new ApiError(403, 'Server chưa cấu hình CRON_SECRET_KEY, tính năng Cron bị khoá.'));
    }

    if (!cronSecret || cronSecret !== envCronSecret) {
        return next(new ApiError(403, 'Từ chối truy cập: Sai hoặc thiếu Cron Secret Key.'));
    }

    next();
};
