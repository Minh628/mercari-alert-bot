import { jest } from '@jest/globals';

// 1. Mock dependencies
jest.unstable_mockModule('../src/config/prisma.js', () => ({
    default: {
        user: {
            findMany: jest.fn(),
            updateMany: jest.fn()
        }
    }
}));

const mockBot = {
    on: jest.fn(),
    onText: jest.fn(),
    sendMessage: jest.fn(),
    setMyCommands: jest.fn()
};

jest.unstable_mockModule('node-telegram-bot-api', () => ({
    default: jest.fn().mockImplementation(() => mockBot)
}));

jest.unstable_mockModule('../src/services/crawler.service.js', () => ({
    triggerReloadCategories: jest.fn()
}));

// Import modules sau khi mock
const prisma = (await import('../src/config/prisma.js')).default;
const userService = (await import('../src/services/user.service.js')).default;
const TelegramBotService = (await import('../src/services/telegramBot.service.js')).default;

describe('User Service & Telegram Bot Service', () => {

    let telegramBotService;

    beforeAll(() => {
        process.env.TELEGRAM_TOKEN = 'mock_token_for_test';
        telegramBotService = TelegramBotService;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('User Service - updateBotStatusByTelegramId', () => {
        
        test('1. Bật bot thành công (Happy Path)', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);

            prisma.user.findMany.mockResolvedValue([{
                id: 1,
                telegramId: '123456',
                expiredAt: futureDate
            }]);

            const result = await userService.updateBotStatusByTelegramId('123456', true);
            
            expect(result).toEqual({ success: true });
            expect(prisma.user.updateMany).toHaveBeenCalledWith({
                where: { telegramId: '123456' },
                data: { isBotActive: true }
            });
        });

        test('2. User không tồn tại (Error Path)', async () => {
            prisma.user.findMany.mockResolvedValue([]);

            const result = await userService.updateBotStatusByTelegramId('999999', true);
            
            expect(result).toEqual({ success: false, reason: 'not_found' });
            expect(prisma.user.updateMany).not.toHaveBeenCalled();
        });

        test('3. User hết hạn bật bot (Edge Case)', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);

            prisma.user.findMany.mockResolvedValue([{
                id: 2,
                telegramId: 'expired_user',
                expiredAt: pastDate
            }]);

            const result = await userService.updateBotStatusByTelegramId('expired_user', true);
            
            expect(result).toEqual({ success: false, reason: 'expired' });
            expect(prisma.user.updateMany).not.toHaveBeenCalled();
        });

        test('4. User hết hạn tắt bot (Edge Case)', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);

            prisma.user.findMany.mockResolvedValue([{
                id: 2,
                telegramId: 'expired_user',
                expiredAt: pastDate
            }]);

            // Gọi truyền false để tắt bot
            const result = await userService.updateBotStatusByTelegramId('expired_user', false);
            
            expect(result).toEqual({ success: true });
            expect(prisma.user.updateMany).toHaveBeenCalledWith({
                where: { telegramId: 'expired_user' },
                data: { isBotActive: false }
            });
        });
    });

    describe('Telegram Bot Service - /startbot', () => {
        test('5. Bot báo tài khoản hết hạn (Error Path)', async () => {
            telegramBotService.startListening();

            // Log tất cả các calls để xem argument đầu tiên là gì
            const startBotCall = mockBot.onText.mock.calls.find(call => call[0].toString().includes('startbot'));
            expect(startBotCall).toBeDefined();
            
            const startBotHandler = startBotCall[1];

            // Giả lập hàm DB trả về user expired
            jest.spyOn(userService, 'updateBotStatusByTelegramId').mockResolvedValueOnce({
                success: false, 
                reason: 'expired'
            });

            // Chạy handler
            await startBotHandler({ chat: { id: 123456 } });

            // Kiểm tra bot nhắn tin nhắn cảnh báo
            expect(mockBot.sendMessage).toHaveBeenCalledWith(
                123456, 
                "⚠️ Tài khoản của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng bot."
            );
        });
    });
});
