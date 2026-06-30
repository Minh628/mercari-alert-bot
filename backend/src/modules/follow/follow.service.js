import prisma from '../../config/prisma.js';
import { triggerReloadCategories } from '../crawler/crawler.service.js';
import itemManagerService from '../crawler/itemManager.service.js';

class FollowService {
  /**
   * Helper: Kiểm tra follow có thuộc về user này không
   */
  async _checkFollowOwnership(id, userId) {
    const followId = Number(id);
    if (isNaN(followId)) throw new Error("NOT_FOUND");

    const follow = await prisma.follow.findFirst({
        where: { id: followId, userId },
        select: { id: true }
    });

    if (!follow) {
        throw new Error("NOT_FOUND");
    }
    return follow;
  }

  /**
   * Lấy danh sách toàn bộ Follow của một User
   * @param {number} userId - ID của User
   * @returns {Promise<Array>} Danh sách follow
   */
  async getAllFollows(userId) {
    return prisma.follow.findMany({
        where: { userId },
        orderBy: { id: 'desc' } // Mới nhất lên trước
    });
  }

/**
 * Thêm mới một Follow vào Database
 * @param {number} userId - ID của User sở hữu
 * @param {Object} data - Dữ liệu follow từ request body
 * @returns {Promise<Object>} Follow vừa tạo
 */
  async addFollow(userId, data) {
    const { keyword, category_id, item_condition_id, status, brand_id, price_min, price_max } = data;

    // Validate bắt buộc: Phải có ít nhất keyword hoặc category_id
    if (!keyword && !category_id) {
        throw new Error("MISSING_KEYWORD_OR_CATEGORY");
    }

    // Tạo follow mới trong Database bằng Prisma
    const newFollow = await prisma.follow.create({
        data: {
            userId,
            ...(keyword && { keyword: String(keyword) }),
            ...(category_id && { categoryId: String(category_id) }),
            // Các trường tùy chọn - chỉ lưu nếu có giá trị
            ...(item_condition_id && { itemConditionId: String(item_condition_id) }),
            ...(status && { status }),
            ...(brand_id && { brandId: String(brand_id) }),
            ...(price_min != null && { priceMin: Number(price_min) }),
            ...(price_max != null && { priceMax: Number(price_max) }),
        }
    });

    // Phát tín hiệu (Signal) bảo Worker (Crawler) cập nhật lại biến RAM
    triggerReloadCategories();

    return newFollow;
};

/**
 * Xóa một Follow theo ID (đảm bảo đúng userId để tránh xóa nhầm của user khác)
 * @param {number} id - ID của follow cần xóa (autoincrement)
 * @param {number} userId - ID của User sở hữu
 * @returns {Promise<Object>} Follow đã bị xóa
 */
  async deleteFollow(id, userId) {
    if (!id) {
        throw new Error("MISSING_ID");
    }

    // Kiểm tra follow có tồn tại và thuộc về user này không
    const follow = await this._checkFollowOwnership(id, userId);

    // Xóa follow
    await prisma.follow.delete({
        where: { id: Number(id) }
    });

    // Phát tín hiệu (Signal) bảo Worker (Crawler) cập nhật lại biến RAM
    triggerReloadCategories();

    return follow;
};  

/**
 * Cập nhật một Follow theo ID (đảm bảo đúng userId để tránh xóa nhầm của user khác)
 * @param {number} id - ID của follow cần cập nhật (autoincrement)
 * @param {number} userId - ID của User sở hữu
 * @param {Object} data - Dữ liệu follow từ request body
 * @returns {Promise<Object>} Follow đã được cập nhật
 */
  async updateFollow(id, userId, data) {
    if (!id) {
        throw new Error("MISSING_ID");
    }

    const follow = await this._checkFollowOwnership(id, userId);

    // Map dữ liệu từ snake_case (Frontend) sang camelCase (Prisma schema)
    const updateData = {};
    if (data.keyword !== undefined) updateData.keyword = data.keyword ? String(data.keyword) : null;
    if (data.category_id !== undefined) updateData.categoryId = data.category_id ? String(data.category_id) : null;
    if (data.item_condition_id !== undefined) updateData.itemConditionId = data.item_condition_id ? String(data.item_condition_id) : null;
    if (data.status !== undefined) updateData.status = data.status || null;
    if (data.brand_id !== undefined) updateData.brandId = data.brand_id ? String(data.brand_id) : null;
    if (data.price_min !== undefined) updateData.priceMin = data.price_min != null ? Number(data.price_min) : null;
    if (data.price_max !== undefined) updateData.priceMax = data.price_max != null ? Number(data.price_max) : null;
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
    if (data.lastScannedAt !== undefined) updateData.lastScannedAt = data.lastScannedAt;

    await prisma.follow.update({
        where: { id: Number(id) },
        data: updateData
    });

    // Nếu khách hàng Tắt Bot (isActive = false), áp dụng HARD RESET:
    // Xóa sạch RAM để dọn rác và ép Khởi Động Nguội cho lần sau.
    if (data.isActive === false) {
        itemManagerService.clearCache(Number(id));
    }

    triggerReloadCategories();

    return follow;
};

/**
 * 👑 Admin: Lấy tất cả Follows của mọi User (kèm thông tin user sở hữu)
 * @returns {Promise<Array>} Danh sách tất cả follow
 */
  async getAllFollowsAdmin() {
    return prisma.follow.findMany({
        orderBy: { id: 'desc' },
        // Kèm thông tin user sở hữu để admin biết follow này thuộc ai
        include: {
            user: {
                select: { id: true, username: true }
            }
        }
    });
  }
}

export default new FollowService();
