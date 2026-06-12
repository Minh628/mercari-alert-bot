import { jest } from '@jest/globals';
import { mockDeep, mockReset } from 'jest-mock-extended';

// Khởi tạo Mock Prisma
const prismaMock = mockDeep();

// Mock Prisma
jest.unstable_mockModule('../../src/config/prisma.js', () => ({
    default: prismaMock,
}));

// Mock Crawler Service
const crawlerMock = {
    triggerReloadCategories: jest.fn(),
};
jest.unstable_mockModule('../../src/services/crawler.service.js', () => crawlerMock);

// Import module cần test sau khi đã mock
const { 
    getAllCategories, 
    addCategory, 
    deleteCategory, 
    updateCategory, 
    getAllCategoriesAdmin 
} = await import('../../src/services/category.service.js');

describe('Category Service', () => {
    beforeEach(() => {
        mockReset(prismaMock);
        crawlerMock.triggerReloadCategories.mockClear();
    });

    describe('getAllCategories', () => {
        it('nên trả về danh sách category của user (Happy path)', async () => {
            // Mock dữ liệu
            const mockData = [{ id: 1, userId: 1, categoryId: 'cat1' }];
            prismaMock.category.findMany.mockResolvedValue(mockData);

            const result = await getAllCategories(1);

            expect(prismaMock.category.findMany).toHaveBeenCalledWith({
                where: { userId: 1 },
                orderBy: { id: 'desc' }
            });
            expect(result).toEqual(mockData);
        });
    });

    describe('addCategory', () => {
        it('nên tạo category mới và gọi triggerReloadCategories (Happy path)', async () => {
            const mockCategory = { id: 1, userId: 1, categoryId: '123' };
            prismaMock.category.create.mockResolvedValue(mockCategory);

            const result = await addCategory(1, { category_id: '123' });

            expect(prismaMock.category.create).toHaveBeenCalled();
            expect(crawlerMock.triggerReloadCategories).toHaveBeenCalled();
            expect(result).toEqual(mockCategory);
        });

        it('nên ném lỗi nếu thiếu category_id (Error path)', async () => {
            await expect(addCategory(1, {})).rejects.toThrow("MISSING_CATEGORY_ID");
            expect(prismaMock.category.create).not.toHaveBeenCalled();
        });
    });

    describe('deleteCategory', () => {
        it('nên xóa category và gọi triggerReloadCategories (Happy path)', async () => {
            prismaMock.category.findFirst.mockResolvedValue({ id: 1 });
            prismaMock.category.delete.mockResolvedValue({ id: 1 });

            const result = await deleteCategory(1, 1);

            expect(prismaMock.category.findFirst).toHaveBeenCalledWith({
                where: { id: 1, userId: 1 },
                select: { id: true }
            });
            expect(prismaMock.category.delete).toHaveBeenCalledWith({
                where: { id: 1 }
            });
            expect(crawlerMock.triggerReloadCategories).toHaveBeenCalled();
            expect(result).toEqual({ id: 1 });
        });

        it('nên ném lỗi NOT_FOUND nếu category không tồn tại hoặc sai user (Error path)', async () => {
            prismaMock.category.findFirst.mockResolvedValue(null);

            await expect(deleteCategory(1, 1)).rejects.toThrow("NOT_FOUND");
            expect(prismaMock.category.delete).not.toHaveBeenCalled();
        });
    });

    describe('updateCategory', () => {
        it('nên cập nhật category thành công (Happy path)', async () => {
            prismaMock.category.findFirst.mockResolvedValue({ id: 1 });
            prismaMock.category.update.mockResolvedValue({ id: 1, status: 'active' });

            await updateCategory(1, 1, { status: 'active' });

            expect(prismaMock.category.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { status: 'active' }
            });
            expect(crawlerMock.triggerReloadCategories).toHaveBeenCalled();
        });

        it('nên ném lỗi MISSING_ID nếu không có id', async () => {
            await expect(updateCategory(null, 1, {})).rejects.toThrow("MISSING_ID");
        });
    });

    describe('getAllCategoriesAdmin', () => {
        it('nên trả về tất cả category kèm user (Happy path)', async () => {
            const mockData = [{ id: 1, user: { id: 1, username: 'test' } }];
            prismaMock.category.findMany.mockResolvedValue(mockData);

            const result = await getAllCategoriesAdmin();
            expect(result).toEqual(mockData);
            expect(prismaMock.category.findMany).toHaveBeenCalledWith({
                orderBy: { id: 'desc' },
                include: { user: { select: { id: true, username: true } } }
            });
        });
    });
});
