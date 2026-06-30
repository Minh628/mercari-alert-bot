import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { setupRoutes } from './config/routes.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';

const app = express();

// ✅ FEAT #2: Helmet - Bảo vệ HTTP headers
app.use(helmet());

// Cấu hình CORS linh hoạt
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:5173']; // Mặc định cho phép dev ở localhost

app.use(cors({
    origin: function (origin, callback) {
        // Cho phép request không có origin (ví dụ server-to-server request như cron-job.org, curl, postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'CORS Policy: Nguồn ' + origin + ' không được phép truy cập.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));

// ✅ FEAT #2: Rate Limiting - Chống spam/DDoS
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 100, // Tối đa 100 request / 15 phút / IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'fail',
        message: 'Quá nhiều request từ IP này, vui lòng thử lại sau 15 phút.'
    }
});
app.use('/api/', apiLimiter);

// Parse request body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// --- Setup Routes ---
setupRoutes(app);

// --- Global Error Handler ---
app.use(globalErrorHandler);

export default app;