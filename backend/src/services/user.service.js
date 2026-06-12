import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import ApiError from '../utils/ApiError.js';

class UserService {
  async registerUser(data) {
    const { username, password, telegramId } = data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      throw new ApiError(400, 'User already exists with this username');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Ensure 7 days expiration for expiredAt based on existing schema
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 7);

    // Save to DB (Default role is MEMBER)
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        telegramId,
        expiredAt, // Required field in schema
        role: 'MEMBER'
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

  async loginUser(username, password) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      throw new ApiError(401, 'Invalid username or password');
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid username or password');
    }

    // Generate JWT
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    return { token, user: payload };
  }

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

  async deleteUser(userId) {
    // Check existence
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId, 10) } });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    await prisma.user.delete({
      where: { id: parseInt(userId, 10) }
    });

    return true;
  }
}

export default new UserService();
