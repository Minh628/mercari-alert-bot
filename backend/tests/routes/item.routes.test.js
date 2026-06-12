import { jest } from '@jest/globals';
import { mockDeep, mockReset } from 'jest-mock-extended';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// 1. Mock Prisma
const prismaMock = mockDeep();
jest.unstable_mockModule('../../src/config/prisma.js', () => ({
    default: prismaMock,
}));

// 2. Import module
const { default: itemRoutes } = await import('../../src/routes/item.routes.js');

// 3. Khởi tạo app express
const app = express();
app.use(express.json());
app.use('/api/items', itemRoutes);

describe('Item Routes', () => {
    beforeEach(() => {
        mockReset(prismaMock);
        process.env.JWT_SECRET = 'test_secret';
    });

    const generateToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET);

    describe('GET /api/items/:categoryId', () => {
        it('nên lấy danh sách items theo category (Happy path)', async () => {
            const token = generateToken({ id: 1, role: 'MEMBER' });
            prismaMock.user.findUnique.mockResolvedValue({ expiredAt: new Date(Date.now() + 100000) });
            prismaMock.category.findFirst.mockResolvedValue({ id: 5, categoryId: 'cat5' });
            prismaMock.item.findMany.mockResolvedValue([{ id: 'm123' }]);

            const res = await request(app)
                .get('/api/items/5')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toBeDefined();
        });

        it('nên trả về 404 nếu không tìm thấy category của user (Error path)', async () => {
            const token = generateToken({ id: 1, role: 'MEMBER' });
            prismaMock.user.findUnique.mockResolvedValue({ expiredAt: new Date(Date.now() + 100000) });
            prismaMock.category.findFirst.mockResolvedValue(null);

            const res = await request(app)
                .get('/api/items/99')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toEqual(404);
        });
    });

    describe('GET /api/items/stats', () => {
        it('nên lấy thống kê cho ADMIN (Happy path)', async () => {
            const token = generateToken({ id: 2, role: 'ADMIN' });

            prismaMock.item.count.mockResolvedValue(10);
            prismaMock.item.groupBy.mockResolvedValue([{ categoryId: 1, _count: { id: 10 } }]);

            const res = await request(app)
                .get('/api/items/stats')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toEqual(200);
        });

        it('nên chặn MEMBER truy cập (Error path)', async () => {
            const token = generateToken({ id: 1, role: 'MEMBER' });
            prismaMock.user.findUnique.mockResolvedValue({ expiredAt: new Date(Date.now() + 100000) });

            const res = await request(app)
                .get('/api/items/stats')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toEqual(403);
        });
    });
});
