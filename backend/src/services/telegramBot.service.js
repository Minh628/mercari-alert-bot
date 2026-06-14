import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import prisma from '../config/prisma.js';
import { triggerReloadCategories } from './crawler.service.js';

dotenv.config({
    quiet : true
});

class TelegramBotService {
    constructor() {
        this.bot = null;
    }

    /**
     * Khởi chạy Bot ở chế độ Polling để lắng nghe lệnh từ người dùng
     */
    startListening() {
        const token = process.env.TELEGRAM_TOKEN;
        if (!token) {
            console.warn('⚠️ Không tìm thấy TELEGRAM_TOKEN, chức năng lắng nghe của Bot sẽ bị vô hiệu hóa.');
            return;
        }

        try {
            // Khởi tạo bot với tính năng polling (lắng nghe liên tục)
            this.bot = new TelegramBot(token, { polling: true });

            // Lắng nghe lệnh /start hoặc /myid
            this.bot.onText(/\/myid|\/start(?!bot)/, (msg) => {
                const chatId = msg.chat.id;
                const firstName = msg.from.first_name || 'bạn';

                // Trả về Chat ID cho người dùng để họ có thể nhập vào hệ thống web
                const replyMsg = `Xin chào ${firstName}!\n\n🆔 Telegram ID của bạn là: \`${chatId}\`\n\n📝 Vui lòng copy dãy số trên và dán vào phần thiết lập tài khoản trên Website để nhận thông báo.`;

                // Sử dụng parse_mode: Markdown để làm nổi bật ID và hỗ trợ copy nhanh trên di động
                this.bot.sendMessage(chatId, replyMsg, { parse_mode: 'Markdown' })
                    .catch(err => console.error(`❌ Lỗi gửi phản hồi Telegram tới ${chatId}:`, err.message));
            });

            // Lắng nghe lệnh /startbot
            this.bot.onText(/\/startbot/, async (msg) => {
                const chatId = msg.chat.id;
                try {
                    const result = await prisma.user.updateMany({
                        where: { telegramId: String(chatId) },
                        data: { isBotActive: true }
                    });
                    
                    if (result.count > 0) {
                        await this.bot.sendMessage(chatId, "✅ Đã TIẾP TỤC gửi thông báo tự động. Bot đang cào dữ liệu trở lại!");
                        triggerReloadCategories();
                    } else {
                        await this.bot.sendMessage(chatId, "⚠️ Bạn chưa liên kết Telegram ID với tài khoản nào trên Website.");
                    }
                } catch (error) {
                    console.error("❌ Lỗi khi xử lý /startbot:", error.message);
                }
            });

            // Lắng nghe lệnh /stopbot
            this.bot.onText(/\/stopbot/, async (msg) => {
                const chatId = msg.chat.id;
                try {
                    const result = await prisma.user.updateMany({
                        where: { telegramId: String(chatId) },
                        data: { isBotActive: false }
                    });
                    
                    if (result.count > 0) {
                        await this.bot.sendMessage(chatId, "🛑 Đã TẠM DỪNG thông báo. Bạn sẽ không nhận được tin nhắn nào nữa cho đến khi gõ lại /startbot.");
                        triggerReloadCategories();
                    } else {
                        await this.bot.sendMessage(chatId, "⚠️ Bạn chưa liên kết Telegram ID với tài khoản nào trên Website.");
                    }
                } catch (error) {
                    console.error("❌ Lỗi khi xử lý /stopbot:", error.message);
                }
            });

            console.log('🤖 Telegram Bot đang lắng nghe tin nhắn...');
        } catch (error) {
            console.error('❌ Khởi tạo Telegram Bot Listener thất bại:', error.message);
        }
    }

    /**
     * Singleton API: Hàm công khai để các service khác gửi tin nhắn
     * Tự động kiểm tra trạng thái bot và bắt lỗi an toàn
     */
    async sendMessage(chatId, text, options = {}) {
        if (!this.bot) {
            console.warn(`⚠️ Bỏ qua gửi Telegram tới ${chatId} vì Bot chưa được khởi tạo.`);
            return;
        }

        try {
            await this.bot.sendMessage(chatId, text, options);
        } catch (error) {
            // Phục vụ cơ chế chống Rate Limit: Nếu dính 429, log ra để check
            console.error(`❌ Lỗi gửi Telegram tới ${chatId}:`, error.message);
        }
    }

    /**
     * Dừng Bot an toàn khi tắt server
     */
    stopListening() {
        if (this.bot) {
            return this.bot.stopPolling()
                .then(() => console.log('✅ Đã dừng Telegram Bot Listener.'))
                .catch(err => console.error('❌ Lỗi khi dừng Telegram Bot Listener:', err.message));
        }
        return Promise.resolve();
    }
}

export default new TelegramBotService();
