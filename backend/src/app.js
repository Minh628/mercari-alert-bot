import express from 'express';
import cors from 'cors';
import { setupRoutes } from './config/routes.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';
import { startCrawlerEngine } from './modules/crawler/crawler.services.js';
const app = express();

// Middlewares
app.use(cors()); // Cực kỳ quan trọng để React (cổng 5173) gọi được API (cổng 3000)
app.use(express.urlencoded({ extended: true })); // Đọc được form data
app.use(express.json()); // Đọc được JSON body


// --- Setup Routes ---
setupRoutes(app);

// --- Global Error Handler ---
app.use(globalErrorHandler);

export default app;