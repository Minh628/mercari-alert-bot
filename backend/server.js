import dotenv from 'dotenv';
import app from './src/app.js';
import { startCrawlerLoop, stopCrawler } from './src/services/crawler.service.js';
import prisma from './src/config/prisma.js';

// Load biến môi trường
dotenv.config({ quiet: true });

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Khởi chạy vòng lặp Crawler ngầm
    console.log(`🚀 Đang kích hoạt cỗ máy Crawler ngầm...`);
    startCrawlerLoop().catch(err => {
        console.error('❌ Cỗ máy Crawler gặp sự cố:', err);
    });
});

// ✅ OPT #3: Graceful Shutdown - Tắt sạch sẽ khi Render gửi tín hiệu SIGTERM
const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 Nhận tín hiệu ${signal}, đang tắt server sạch sẽ...`);
    
    // 1. Dừng crawler + đóng browser
    await stopCrawler();
    
    // 2. Đóng kết nối DB
    await prisma.$disconnect();
    console.log('✅ Đã đóng kết nối Database.');
    
    // 3. Đóng HTTP server
    server.close(() => {
        console.log('✅ Server đã tắt hoàn toàn.');
        process.exit(0);
    });
    
    // Force exit nếu graceful shutdown quá lâu (10s)
    setTimeout(() => {
        console.error('⚠️ Force exit sau 10s timeout.');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
