import { jest } from '@jest/globals';
import { mockDeep, mockReset } from 'jest-mock-extended';

// Khởi tạo Mock Prisma
const prismaMock = mockDeep();
jest.unstable_mockModule('../../src/config/prisma.js', () => ({
    default: prismaMock,
}));

// Import ItemService
const { default: ItemService } = await import('../../src/services/item.service.js');

describe('Item Service', () => {
    beforeEach(() => {
        mockReset(prismaMock);
    });

    describe('getItemsByCategory', () => {
        it('nên trả về items nếu category thuộc về user (Happy path)', async () => {
            const mockCategory = { id: 1, categoryId: 'cat1' };
            const mockItems = [{ id: 'm123', createdAt: new Date() }];

            prismaMock.category.findFirst.mockResolvedValue(mockCategory);
            prismaMock.item.findMany.mockResolvedValue(mockItems);

            const result = await ItemService.getItemsByCategory(1, 1);

            expect(prismaMock.category.findFirst).toHaveBeenCalledWith({
                where: { id: 1, userId: 1 },
                select: { id: true, categoryId: true }
            });
            expect(result).toEqual({ category: mockCategory, items: mockItems });
        });

        it('nên ném lỗi 404 nếu không tìm thấy category (Error path)', async () => {
            prismaMock.category.findFirst.mockResolvedValue(null);

            await expect(ItemService.getItemsByCategory(99, 1))
                .rejects.toThrow('Không tìm thấy Category hoặc bạn không có quyền truy cập');
        });
    });

    describe('getStats', () => {
        it('nên trả về thống kê số lượng items (Happy path)', async () => {
            prismaMock.item.count.mockResolvedValue(100);
            prismaMock.item.groupBy.mockResolvedValue([
                { categoryId: 1, _count: { id: 60 } },
                { categoryId: 2, _count: { id: 40 } }
            ]);

            const result = await ItemService.getStats();

            expect(result.totalItems).toBe(100);
            expect(result.categoriesWithItems).toBe(2);
            expect(result.breakdown).toHaveLength(2);
        });
    });

    describe('cleanup', () => {
        it('nên xoá các items cũ hơn số ngày chỉ định (Happy path)', async () => {
            prismaMock.item.deleteMany.mockResolvedValue({ count: 50 });

            const result = await ItemService.cleanup(7);

            expect(prismaMock.item.deleteMany).toHaveBeenCalled();
            expect(result.deletedCount).toBe(50);
            expect(result).toHaveProperty('olderThan');
        });
    });
});
