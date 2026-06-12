import { jest } from '@jest/globals';
import { mockDeep, mockReset } from 'jest-mock-extended';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Khởi tạo Mock Prisma
const prismaMock = mockDeep();
jest.unstable_mockModule('../../src/config/prisma.js', () => ({
    default: prismaMock,
}));

// Import UserService
const { default: UserService } = await import('../../src/services/user.service.js');

describe('User Service', () => {
    beforeEach(() => {
        mockReset(prismaMock);
        process.env.JWT_SECRET = 'test_secret';
    });

    describe('registerUser', () => {
        it('nên đăng ký thành công (Happy path)', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null); // Không bị trùng user
            const mockUser = { id: 1, username: 'testuser', role: 'MEMBER' };
            prismaMock.user.create.mockResolvedValue(mockUser);

            const result = await UserService.registerUser({ username: 'testuser', password: '123' });

            expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { username: 'testuser' } });
            expect(prismaMock.user.create).toHaveBeenCalled();
            expect(result).toEqual(mockUser);
        });

        it('nên ném lỗi nếu username đã tồn tại (Error path)', async () => {
            prismaMock.user.findUnique.mockResolvedValue({ id: 1, username: 'testuser' });

            await expect(UserService.registerUser({ username: 'testuser', password: '123' }))
                .rejects.toThrow('User already exists with this username');
            expect(prismaMock.user.create).not.toHaveBeenCalled();
        });
    });

    describe('loginUser', () => {
        it('nên đăng nhập thành công và trả về token (Happy path)', async () => {
            const hashedPassword = await bcrypt.hash('123', 10);
            const mockUser = { 
                id: 1, 
                username: 'testuser', 
                password: hashedPassword, 
                role: 'MEMBER', 
                expiredAt: new Date(Date.now() + 100000) // Chưa hết hạn
            };
            prismaMock.user.findUnique.mockResolvedValue(mockUser);

            const result = await UserService.loginUser('testuser', '123');

            expect(result).toHaveProperty('token');
            expect(result.user).toHaveProperty('id', 1);
            expect(result.user).toHaveProperty('username', 'testuser');
        });

        it('nên ném lỗi nếu sai username hoặc password (Error path)', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);

            await expect(UserService.loginUser('wronguser', '123')).rejects.toThrow('Invalid username or password');
        });

        it('nên ném lỗi nếu tài khoản đã hết hạn (Error path)', async () => {
            const hashedPassword = await bcrypt.hash('123', 10);
            const mockUser = { 
                id: 1, 
                username: 'testuser', 
                password: hashedPassword, 
                role: 'MEMBER', 
                expiredAt: new Date(Date.now() - 100000) // Đã hết hạn
            };
            prismaMock.user.findUnique.mockResolvedValue(mockUser);

            await expect(UserService.loginUser('testuser', '123')).rejects.toThrow('Tài khoản đã hết hạn. Vui lòng liên hệ Admin để gia hạn.');
        });
    });

    describe('getUserById', () => {
        it('nên trả về thông tin user (Happy path)', async () => {
            const mockUser = { id: 1, username: 'test' };
            prismaMock.user.findUnique.mockResolvedValue(mockUser);

            const result = await UserService.getUserById(1);
            expect(result).toEqual(mockUser);
        });

        it('nên ném lỗi nếu không tìm thấy (Error path)', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);
            await expect(UserService.getUserById(99)).rejects.toThrow('User not found');
        });
    });

    describe('updateSelfProfile', () => {
        it('nên cho phép đổi mật khẩu và telegramId (Happy path)', async () => {
            const mockUser = { id: 1, username: 'test', telegramId: 'abc' };
            prismaMock.user.update.mockResolvedValue(mockUser);

            const result = await UserService.updateSelfProfile(1, { password: 'newpass', telegramId: 'abc' });

            expect(prismaMock.user.update).toHaveBeenCalled();
            expect(result).toEqual(mockUser);
        });

        it('nên ném lỗi nếu không có dữ liệu cần thiết (Error path)', async () => {
            await expect(UserService.updateSelfProfile(1, { role: 'ADMIN' })).rejects.toThrow('Không có trường hợp lệ để cập nhật (chỉ chấp nhận: password, telegramId)');
        });
    });

    describe('getAllUsers', () => {
        it('nên trả về tất cả users (Happy path)', async () => {
            prismaMock.user.findMany.mockResolvedValue([{ id: 1 }]);
            const result = await UserService.getAllUsers();
            expect(result).toEqual([{ id: 1 }]);
        });
    });

    describe('updateUser', () => {
        it('nên cho phép admin cập nhật các trường được phép (Happy path)', async () => {
            prismaMock.user.findUnique.mockResolvedValue({ id: 1 });
            prismaMock.user.update.mockResolvedValue({ id: 1, role: 'ADMIN' });

            const result = await UserService.updateUser(1, { role: 'ADMIN' });
            expect(prismaMock.user.update).toHaveBeenCalled();
            expect(result).toEqual({ id: 1, role: 'ADMIN' });
        });
    });

    describe('deleteUser', () => {
        it('nên xóa user thành công (Happy path)', async () => {
            prismaMock.user.findUnique.mockResolvedValue({ id: 1 });
            prismaMock.user.delete.mockResolvedValue({ id: 1 });

            const result = await UserService.deleteUser(1);
            expect(prismaMock.user.delete).toHaveBeenCalled();
            expect(result).toBe(true);
        });
    });
});
