import dotenv from 'dotenv';
import app from './src/app.js';
import { startCrawlerLoop } from './src/modules/crawler/crawler.services.js';

// Load biến môi trường
dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Khởi chạy vòng lặp Crawler ngầm
    console.log(`🚀 Đang kích hoạt cỗ máy Crawler ngầm...`);
    startCrawlerLoop().catch(err => {
        console.error('❌ Cỗ máy Crawler gặp sự cố:', err);
    });
});
