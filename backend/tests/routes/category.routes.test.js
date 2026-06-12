import { jest } from '@jest/globals';
import { mockDeep, mockReset } from 'jest-mock-extended';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// 1. Khởi tạo Mock Prisma và Crawler
const prismaMock = mockDeep();
jest.unstable_mockModule('../../src/config/prisma.js', () => ({
    default: prismaMock,
}));

const crawlerMock = {
    triggerReloadCategories: jest.fn(),
};
jest.unstable_mockModule('../../src/services/crawler.service.js', () => crawlerMock);

// 2. Import module
const { default: categoryRoutes } = await import('../../src/routes/category.routes.js');

// 3. Khởi tạo app express
const app = express();
app.use(express.json());
app.use('/api/categories', categoryRoutes);

describe('Category Routes', () => {
    beforeEach(() => {
        mockReset(prismaMock);
        crawlerMock.triggerReloadCategories.mockClear();
        process.env.JWT_SECRET = 'test_secret';
    });

    const generateToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET);

    describe('GET /api/categories', () => {
        it('nên trả về danh sách categories của user (Happy path)', async () => {
            const token = generateToken({ id: 1, role: 'MEMBER' });
            prismaMock.user.findUnique.mockResolvedValue({ expiredAt: new Date(Date.now() + 100000) });
            prismaMock.category.findMany.mockResolvedValue([{ id: 1, categoryId: 'cat1' }]);

            const res = await request(app)
                .get('/api/categories')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toEqual(200);
        });
    });

    describe('POST /api/categories', () => {
        it('nên tạo mới category (Happy path)', async () => {
            const token = generateToken({ id: 1, role: 'MEMBER' });
            prismaMock.user.findUnique.mockResolvedValue({ expiredAt: new Date(Date.now() + 100000) });
            prismaMock.category.create.mockResolvedValue({ id: 2, categoryId: 'cat2' });

            const res = await request(app)
                .post('/api/categories')
                .set('Authorization', `Bearer ${token}`)
                .send({ category_id: 'cat2' });

            expect(res.statusCode).toEqual(201);
        });

        it('nên trả về 400 nếu thiếu category_id (Error path)', async () => {
            const token = generateToken({ id: 1, role: 'MEMBER' });
            prismaMock.user.findUnique.mockResolvedValue({ expiredAt: new Date(Date.now() + 100000) });

            const res = await request(app)
                .post('/api/categories')
                .set('Authorization', `Bearer ${token}`)
                .send({}); // Bỏ trống body

            expect(res.statusCode).toEqual(400);
        });
    });
    
    describe('DELETE /api/categories/:id', () => {
        it('nên xóa category (Happy path)', async () => {
            const token = generateToken({ id: 1, role: 'MEMBER' });
            prismaMock.user.findUnique.mockResolvedValue({ expiredAt: new Date(Date.now() + 100000) });
            prismaMock.category.findFirst.mockResolvedValue({ id: 1 });
            prismaMock.category.delete.mockResolvedValue({ id: 1 });

            const res = await request(app)
                .delete('/api/categories/1')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toEqual(200);
        });
    });
});
