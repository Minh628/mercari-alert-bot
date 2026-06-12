import prisma from '../config/prisma.js';
import ApiError from '../utils/ApiError.js';

/**
 * Middleware kiểm tra tài khoản hết hạn (expiredAt)
 * - Admin: Bỏ qua, không bị giới hạn
 * - Member: Nếu expiredAt < now() → chặn truy cập
 */
export const checkExpiry = async (req, res, next) => {
    try {
        // Admin không bị giới hạn hạn sử dụng
        if (req.user?.role === 'ADMIN') {
            return next();
        }

        // Query DB lấy thời hạn thực tế (không tin JWT vì JWT có thể chưa refresh)
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { expiredAt: true }
        });

        if (!user) {
            return next(new ApiError(404, 'User không tồn tại'));
        }

        // So sánh thời gian hiện tại với ngày hết hạn
        if (new Date() > new Date(user.expiredAt)) {
            return next(new ApiError(403, 'Tài khoản đã hết hạn. Vui lòng liên hệ Admin để gia hạn.'));
        }

        next();
    } catch (error) {
        next(error);
    }
};
