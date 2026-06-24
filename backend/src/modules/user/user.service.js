import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma.js';
import ApiError from '../../utils/ApiError.js';

class UserService {
  /**
   * Helper mã hóa mật khẩu
   */
  async _hashPassword(password) {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * 👑 Admin tạo tài khoản mới (có thể set role, expiredAt)
   */
  async registerUser(data) {
    const { username, password, telegramId, role, expiredAt } = data;

    // Kiểm tra trùng username
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      throw new ApiError(400, 'User already exists with this username');
    }

    // Mã hoá mật khẩu
    const hashedPassword = await this._hashPassword(password);

    // Mặc định hết hạn sau 7 ngày nếu Admin không truyền expiredAt
    const defaultExpired = new Date();
    defaultExpired.setDate(defaultExpired.getDate() + 7);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        telegramId,
        expiredAt: expiredAt ? new Date(expiredAt) : defaultExpired,
        role: role || 'MEMBER'
      },
      select: {
        id: true,
        username: true,
        telegramId: true,
        role: true,
        createdAt: true,
        expiredAt: true
      }
    });

    return user;
  }

  /**
   * Đăng nhập, trả về JWT token
   */
  async loginUser(username, password) {
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      throw new ApiError(401, 'Invalid username or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid username or password');
    }

    // ✅ FIX BUG #2: Chặn user hết hạn đăng nhập (Admin không bị giới hạn)
    if (user.role !== 'ADMIN' && new Date() > new Date(user.expiredAt)) {
      throw new ApiError(403, 'Tài khoản đã hết hạn. Vui lòng liên hệ Admin để gia hạn.');
    }

    // Payload chứa id, username, role để middleware decode
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    return { token, user: payload };
  }

  /**
   * Lấy thông tin profile theo userId
   */
  async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId, 10) },
      select: {
        id: true,
        username: true,
        telegramId: true,
        role: true,
        createdAt: true,
        expiredAt: true
      }
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  }

  /**
   * 👤 Member tự cập nhật profile (chỉ cho phép đổi password và telegramId)
   * Whitelist nghiêm ngặt: KHÔNG cho đổi role, expiredAt, username
   */
  async updateSelfProfile(userId, data) {
    const updateData = {};

    // Chỉ chấp nhận 2 trường được phép
    if (data.password) {
      updateData.password = await this._hashPassword(data.password);
    }

    // telegramId cho phép set null (xoá liên kết) hoặc chuỗi mới
    if (data.telegramId !== undefined) {
      updateData.telegramId = data.telegramId;
    }

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, 'Không có trường hợp lệ để cập nhật (chỉ chấp nhận: password, telegramId)');
    }

    const user = await prisma.user.update({
      where: { id: parseInt(userId, 10) },
      data: updateData,
      select: {
        id: true,
        username: true,
        telegramId: true,
        role: true
      }
    });

    return user;
  }

  /**
   * 👑 Admin: Lấy danh sách tất cả Users
   */
  async getAllUsers() {
    return prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        username: true,
        telegramId: true,
        role: true,
        createdAt: true,
        expiredAt: true,
        // Đếm số lượng follow của mỗi user
        _count: { select: { follows: true } }
      }
    });
  }

  /**
   * 👑 Admin: Cập nhật thông tin User bất kỳ (role, expiredAt, telegramId, reset password)
   */
  async updateUser(userId, data) {
    const updateData = {};

    // Admin có thể đổi các trường sau
    if (data.password) {
      updateData.password = await this._hashPassword(data.password);
    }
    if (data.telegramId !== undefined) {
      updateData.telegramId = data.telegramId;
    }
    if (data.role) {
      updateData.role = data.role;
    }
    if (data.expiredAt) {
      updateData.expiredAt = new Date(data.expiredAt);
    }

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, 'Không có trường hợp lệ để cập nhật');
    }

    try {
      const user = await prisma.user.update({
        where: { id: parseInt(userId, 10) },
        data: updateData,
        select: {
          id: true,
          username: true,
          telegramId: true,
          role: true,
          createdAt: true,
          expiredAt: true
        }
      });

      return user;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new ApiError(404, 'User not found');
      }
      throw error;
    }
  }

  /**
   * 👑 Admin: Xoá User
   */
  async deleteUser(userId) {
    try {
      await prisma.user.delete({
        where: { id: parseInt(userId, 10) }
      });
      return true;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new ApiError(404, 'User not found');
      }
      throw error;
    }
  }

  /**
   * Cập nhật trạng thái bot (bật/tắt) dựa trên Telegram ID
   * Giúp tách biệt logic DB khỏi TelegramBot Service
   */
  async updateBotStatusByTelegramId(telegramId, isBotActive) {
    // Tìm user theo telegramId
    const users = await prisma.user.findMany({
      where: { telegramId: String(telegramId) }
    });

    if (!users || users.length === 0) {
      return { success: false, reason: 'not_found' };
    }

    const user = users[0];

    // Kiểm tra nếu yêu cầu bật bot nhưng tài khoản đã hết hạn
    if (isBotActive && new Date() > new Date(user.expiredAt)) {
      return { success: false, reason: 'expired' };
    }

    // Cập nhật trạng thái bot
    await prisma.user.updateMany({
      where: { telegramId: String(telegramId) },
      data: { isBotActive }
    });
    
    return { success: true };
  }
}

export default new UserService();
