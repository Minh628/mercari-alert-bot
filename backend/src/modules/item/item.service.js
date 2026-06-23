import prisma from '../../config/prisma.js';
import ApiError from '../../utils/ApiError.js';

class ItemService {
  /**
   * 🔑 Lấy danh sách Items của một Category (đảm bảo category thuộc user hiện tại)
   * @param {number} categoryId - ID của category
   * @param {number} userId - ID của user sở hữu
   * @returns {Promise<Array>} Danh sách items
   */
  async getItemsByCategory(categoryId, userId) {
    // Kiểm tra category có thuộc về user này không
    const category = await prisma.category.findFirst({
      where: { id: parseInt(categoryId, 10), userId },
      select: { id: true, categoryId: true }
    });

    if (!category) {
      throw new ApiError(404, 'Không tìm thấy Category hoặc bạn không có quyền truy cập');
    }

    // Lấy items của category này, mới nhất lên trước
    const items = await prisma.item.findMany({
      where: { categoryId: category.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true
      }
    });

    return { category, items };
  }

  /**
   * 👑 Admin: Thống kê tổng số Items trong hệ thống
   * @returns {Promise<Object>} Thống kê items
   */
  async getStats() {
    // Đếm tổng items và nhóm theo category
    const [totalItems, itemsByCategory] = await Promise.all([
      prisma.item.count(),
      prisma.item.groupBy({
        by: ['categoryId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      })
    ]);

    return {
      totalItems,
      categoriesWithItems: itemsByCategory.length,
      breakdown: itemsByCategory
    };
  }

  /**
   * 👑 Admin: Dọn dẹp Items cũ hơn số ngày chỉ định
   * @param {number} daysOld - Xoá items cũ hơn bao nhiêu ngày (mặc định 7)
   * @returns {Promise<Object>} Kết quả xoá
   */
  async cleanup(daysOld = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.item.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    return {
      deletedCount: result.count,
      olderThan: cutoffDate.toISOString()
    };
  }
}

export default new ItemService();
