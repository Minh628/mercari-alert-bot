import { jest } from '@jest/globals';
import { mockDeep, mockReset } from 'jest-mock-extended';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// 1. Khởi tạo Mock Prisma
const prismaMock = mockDeep();
jest.unstable_mockModule('../../src/config/prisma.js', () => ({
    default: prismaMock,
}));

// 2. Import module sau khi đã mock
const { default: userRoutes } = await import('../../src/routes/user.routes.js');

// 3. Khởi tạo app express dùng cho test
const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

describe('User Routes', () => {
    beforeEach(() => {
        mockReset(prismaMock);
        process.env.JWT_SECRET = 'test_secret';
    });

    const generateToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET);

    describe('POST /api/users/login', () => {
        it('nên trả về 401 nếu sai user/pass (Error path)', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);

            const res = await request(app)
                .post('/api/users/login')
                .send({ username: 'wrong', password: '123' });

            expect(res.statusCode).toEqual(401);
        });

        // Bỏ qua Happy Path login vì vướng mã hoá bcrypt trong service (khó mock toàn vẹn ở mức Route Test)
        // Chúng ta đã test Happy Path trong user.service.test.js
    });

    describe('GET /api/users/profile', () => {
        it('nên trả về thông tin profile nếu có token hợp lệ (Happy path)', async () => {
            const token = generateToken({ id: 1, username: 'test', role: 'MEMBER' });
            prismaMock.user.findUnique.mockResolvedValue({ id: 1, username: 'test' });

            const res = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('username', 'test');
        });

        it('nên trả về 401 nếu không truyền token (Error path)', async () => {
            const res = await request(app).get('/api/users/profile');
            expect(res.statusCode).toEqual(401);
        });
    });

    describe('POST /api/users (Admin register)', () => {
        it('nên cho phép ADMIN tạo user mới (Happy path)', async () => {
            const token = generateToken({ id: 1, username: 'admin', role: 'ADMIN' });
            prismaMock.user.findUnique.mockResolvedValue(null);
            prismaMock.user.create.mockResolvedValue({ id: 2, username: 'newuser' });

            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${token}`)
                .send({ username: 'newuser', password: '123' });

            expect(res.statusCode).toEqual(201);
            expect(res.body.data).toHaveProperty('username', 'newuser');
        });

        it('nên chặn MEMBER truy cập API của ADMIN (Error path)', async () => {
            const token = generateToken({ id: 2, username: 'member', role: 'MEMBER' });

            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${token}`)
                .send({ username: 'newuser', password: '123' });

            expect(res.statusCode).toEqual(403); // Lỗi phân quyền
        });
    });
});
