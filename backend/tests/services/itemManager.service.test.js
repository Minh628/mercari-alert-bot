import { jest } from '@jest/globals';
import { mockDeep, mockReset } from 'jest-mock-extended';

// Khởi tạo Mock Prisma
const prismaMock = mockDeep();
jest.unstable_mockModule('../../src/config/prisma.js', () => ({
    default: prismaMock,
}));

// Import ItemManagerService
const { default: ItemManagerService } = await import('../../src/services/itemManager.service.js');

describe('Item Manager Service', () => {
    beforeEach(() => {
        mockReset(prismaMock);
        // Reset state của instance
        ItemManagerService.cache.clear();
        ItemManagerService.isEvicting.clear();
    });

    describe('processNewItem', () => {
        it('nên trả về false nếu item đã tồn tại trong cache (O(1) Check)', async () => {
            ItemManagerService.cache.set(1, new Set(['m123']));

            const result = await ItemManagerService.processNewItem(1, 'm123');

            expect(result).toBe(false);
            expect(prismaMock.item.create).not.toHaveBeenCalled();
        });

        it('nên trả về true và lưu DB nếu item chưa tồn tại (Happy path)', async () => {
            prismaMock.item.create.mockResolvedValue({ id: 'm456', categoryId: 1 });

            const result = await ItemManagerService.processNewItem(1, 'm456');

            expect(result).toBe(true);
            expect(prismaMock.item.create).toHaveBeenCalledWith({
                data: { id: 'm456', categoryId: 1 }
            });
            expect(ItemManagerService.cache.get(1).has('m456')).toBe(true);
        });

        it('nên trả về false và vẫn lưu cache nếu lỗi P2002 của Prisma (Error path)', async () => {
            const error = new Error();
            error.code = 'P2002';
            prismaMock.item.create.mockRejectedValue(error);

            const result = await ItemManagerService.processNewItem(1, 'm789');

            expect(result).toBe(false);
            expect(ItemManagerService.cache.get(1).has('m789')).toBe(true);
        });

        it('nên ném lỗi ra ngoài nếu Prisma lỗi khác P2002 (Error path)', async () => {
            const error = new Error('DB Error');
            prismaMock.item.create.mockRejectedValue(error);

            await expect(ItemManagerService.processNewItem(1, 'm999')).rejects.toThrow('DB Error');
        });

        it('nên gọi logic evict (Sliding Window) nếu cache vượt quá 1000 items', async () => {
            // Chèn sẵn 1000 items vào cache
            const cache = new Set();
            for (let i = 0; i < 1000; i++) cache.add(`old${i}`);
            ItemManagerService.cache.set(1, cache);

            prismaMock.item.create.mockResolvedValue({});
            
            // Cần giả lập DB khi gọi _evictOldItems
            const mockOldItems = [{ id: 'old0' }, { id: 'old1' }];
            prismaMock.item.findMany.mockResolvedValue(mockOldItems);
            prismaMock.item.deleteMany.mockResolvedValue({ count: 2 });

            const result = await ItemManagerService.processNewItem(1, 'new1001');

            expect(result).toBe(true);
            
            // Do logic evict chạy ngầm (async không await trong processNewItem), 
            // ta cần đợi 1 chút bằng setImmediate hoặc setTimeout để Promise chạy xong
            await new Promise(resolve => setImmediate(resolve));

            expect(prismaMock.item.findMany).toHaveBeenCalled();
            expect(prismaMock.item.deleteMany).toHaveBeenCalled();
            
            // old0 và old1 nên bị xoá khỏi cache
            expect(ItemManagerService.cache.get(1).has('old0')).toBe(false);
            expect(ItemManagerService.cache.get(1).has('old1')).toBe(false);
            expect(ItemManagerService.cache.get(1).has('new1001')).toBe(true);
        });
    });

    describe('preloadCache', () => {
        it('nên tải 1000 items từ DB vào RAM', async () => {
            const mockItems = [{ id: 'item1' }, { id: 'item2' }];
            prismaMock.item.findMany.mockResolvedValue(mockItems);

            await ItemManagerService.preloadCache(1);

            expect(prismaMock.item.findMany).toHaveBeenCalledWith({
                where: { categoryId: 1 },
                orderBy: { createdAt: 'desc' },
                take: 1000,
                select: { id: true }
            });
            expect(ItemManagerService.cache.get(1).has('item1')).toBe(true);
            expect(ItemManagerService.cache.get(1).has('item2')).toBe(true);
        });
    });
});
