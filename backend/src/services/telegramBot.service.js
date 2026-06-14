import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

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
            this.bot.onText(/\/(start|myid)/, (msg) => {
                const chatId = msg.chat.id;
                const firstName = msg.from.first_name || 'bạn';

                // Trả về Chat ID cho người dùng để họ có thể nhập vào hệ thống web
                const replyMsg = `Xin chào ${firstName}!\n\n🆔 Telegram ID của bạn là: \`${chatId}\`\n\n📝 Vui lòng copy dãy số trên và dán vào phần thiết lập tài khoản trên Website để nhận thông báo.`;

                // Sử dụng parse_mode: Markdown để làm nổi bật ID và hỗ trợ copy nhanh trên di động
                this.bot.sendMessage(chatId, replyMsg, { parse_mode: 'Markdown' })
                    .catch(err => console.error(`❌ Lỗi gửi phản hồi Telegram tới ${chatId}:`, err.message));
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
            this.bot.stopPolling()
                .then(() => console.log('✅ Đã dừng Telegram Bot Listener.'))
                .catch(err => console.error('❌ Lỗi khi dừng Telegram Bot Listener:', err.message));
        }
    }
}

export default new TelegramBotService();
