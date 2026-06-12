import { jest } from '@jest/globals';
import { mockDeep, mockReset } from 'jest-mock-extended';

// 1. Mock Prisma
const prismaMock = mockDeep();
jest.unstable_mockModule('../../src/config/prisma.js', () => ({
    default: prismaMock,
}));

// 2. Mock ItemManagerService
const itemManagerMock = {
    preloadCache: jest.fn(),
    processNewItem: jest.fn()
};
jest.unstable_mockModule('../../src/services/itemManager.service.js', () => ({
    default: itemManagerMock
}));

// 3. Mock node-telegram-bot-api
const botMockInstance = {
    sendMessage: jest.fn().mockResolvedValue(true)
};
jest.unstable_mockModule('node-telegram-bot-api', () => {
    return {
        default: jest.fn(() => botMockInstance)
    };
});

// 4. Mock playwright-extra
const browserMock = {
    newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
            route: jest.fn(),
            on: jest.fn(),
            goto: jest.fn(),
            waitForResponse: jest.fn(),
        }),
        close: jest.fn()
    }),
    isConnected: jest.fn().mockReturnValue(true),
    close: jest.fn()
};
const chromiumMock = {
    use: jest.fn(),
    launch: jest.fn().mockResolvedValue(browserMock)
};
jest.unstable_mockModule('playwright-extra', () => ({
    chromium: chromiumMock
}));

// 5. Mock stealth plugin
jest.unstable_mockModule('puppeteer-extra-plugin-stealth', () => ({
    default: jest.fn()
}));

// Import module sau khi đã mock
const { triggerReloadCategories, startCrawlerLoop, stopCrawler } = await import('../../src/services/crawler.service.js');

describe('Crawler Service', () => {
    beforeEach(() => {
        mockReset(prismaMock);
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await stopCrawler(); // Dọn dẹp
    });

    describe('triggerReloadCategories', () => {
        it('nên tải lại danh sách category đang active và gọi preloadCache', async () => {
            const mockCategories = [
                { id: 1, categoryId: 'cat1', user: { telegramId: 'user1' } }
            ];
            prismaMock.category.findMany.mockResolvedValue(mockCategories);

            await triggerReloadCategories();

            expect(prismaMock.category.findMany).toHaveBeenCalled();
            expect(itemManagerMock.preloadCache).toHaveBeenCalledWith(1);
        });
    });
    
    describe('stopCrawler', () => {
        it('nên dừng crawler mà không quăng lỗi', async () => {
            await stopCrawler();
            expect(browserMock.close).not.toHaveBeenCalled(); // Vì lúc này instance persistentBrowser chưa khởi tạo trong test run cụ thể, nhưng function chạy an toàn
        });
    });
});
