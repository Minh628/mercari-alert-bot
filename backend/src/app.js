import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { setupRoutes } from './config/routes.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';

const app = express();

// ✅ FEAT #2: Helmet - Bảo vệ HTTP headers
app.use(helmet());

// CORS - Cho phép frontend (React) gọi API
app.use(cors());

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