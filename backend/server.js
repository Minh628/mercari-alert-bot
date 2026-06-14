import dotenv from 'dotenv';
import app from './src/app.js';
import { startCrawlerLoop, stopCrawler } from './src/services/crawler.service.js';
import telegramBotService from './src/services/telegramBot.service.js';
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

    // Kích hoạt Telegram Bot lắng nghe tin nhắn để hỗ trợ User lấy ID
    telegramBotService.startListening();
});

// ✅ OPT #3: Graceful Shutdown - Tắt sạch sẽ khi Render gửi tín hiệu SIGTERM
const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 Nhận tín hiệu ${signal}, đang tắt server sạch sẽ...`);
    
    // Chạy song song 3 tác vụ Shutdown để tránh Deadlock do Windows Console kill tiến trình con
    await Promise.allSettled([
        stopCrawler().catch(e => console.log('⚠️ [Crawler Shutdown Lỗi]:', e.message)),
        telegramBotService.stopListening().catch(e => console.log('⚠️ [Telegram Shutdown Lỗi]:', e.message)),
        prisma.$disconnect()
            .then(() => console.log('✅ Đã đóng kết nối Database.'))
            .catch(e => console.log('⚠️ [DB Shutdown Lỗi]:', e.message))
    ]);
    
    // Đóng HTTP server
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
