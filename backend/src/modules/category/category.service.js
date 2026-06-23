import prisma from '../../config/prisma.js';
import { triggerReloadCategories } from '../crawler/crawler.service.js';
import itemManagerService from '../crawler/itemManager.service.js';

class CategoryService {
  /**
   * Helper: Kiểm tra category có thuộc về user này không
   */
  async _checkCategoryOwnership(id, userId) {
    const category = await prisma.category.findFirst({
        where: { id: Number(id), userId },
        select: { id: true }
    });

    if (!category) {
        throw new Error("NOT_FOUND");
    }
    return category;
  }

  /**
   * Lấy danh sách toàn bộ Category của một User
   * @param {number} userId - ID của User
   * @returns {Promise<Array>} Danh sách category
   */
  async getAllCategories(userId) {
    return prisma.category.findMany({
        where: { userId },
        orderBy: { id: 'desc' } // Mới nhất lên trước
    });
  }

/**
 * Thêm mới một Category vào Database
 * @param {number} userId - ID của User sở hữu
 * @param {Object} data - Dữ liệu category từ request body
 * @returns {Promise<Object>} Category vừa tạo
 */
  async addCategory(userId, data) {
    const { category_id, item_condition_id, status, brand_id, price_min, price_max } = data;

    // Validate bắt buộc
    if (!category_id) {
        throw new Error("MISSING_CATEGORY_ID");
    }

    // Tạo category mới trong Database bằng Prisma
    const newCategory = await prisma.category.create({
        data: {
            categoryId: String(category_id),
            userId,
            // Các trường tùy chọn - chỉ lưu nếu có giá trị
            ...(item_condition_id && { itemConditionId: String(item_condition_id) }),
            ...(status && { status }),
            ...(brand_id && { brandId: String(brand_id) }),
            ...(price_min != null && { priceMin: Number(price_min) }),
            ...(price_max != null && { priceMax: Number(price_max) }),
        }
    });

    // Phát tín hiệu (Signal) bảo Worker (Crawler) cập nhật lại biến RAM
    // (Không cần dùng await ở đây để không làm chậm response trả về cho frontend)
    triggerReloadCategories();

    return newCategory;
};

/**
 * Xóa một Category theo ID (đảm bảo đúng userId để tránh xóa nhầm của user khác)
 * @param {number} id - ID của category cần xóa (autoincrement)
 * @param {number} userId - ID của User sở hữu
 * @returns {Promise<Object>} Category đã bị xóa
 */
  async deleteCategory(id, userId) {
    if (!id) {
        throw new Error("MISSING_ID");
    }

    // Kiểm tra category có tồn tại và thuộc về user này không
    const category = await this._checkCategoryOwnership(id, userId);

    // Xóa category (các Item liên quan sẽ tự động bị xóa nhờ onDelete: Cascade)
    await prisma.category.delete({
        where: { id: Number(id) }
    });

    // Phát tín hiệu (Signal) bảo Worker (Crawler) cập nhật lại biến RAM
    triggerReloadCategories();

    return category;
};  

/**
 * Cập nhật một Category theo ID (đảm bảo đúng userId để tránh xóa nhầm của user khác)
 * @param {number} id - ID của category cần cập nhật (autoincrement)
 * @param {number} userId - ID của User sở hữu
 * @param {Object} data - Dữ liệu category từ request body
 * @returns {Promise<Object>} Category đã được cập nhật
 */
  async updateCategory(id, userId, data) {
    if (!id) {
        throw new Error("MISSING_ID");
    }

    const category = await this._checkCategoryOwnership(id, userId);

    await prisma.category.update({
        where: { id: Number(id) },
        data: data
    });

    // Nếu khách hàng Tắt Bot (isActive = false), áp dụng HARD RESET:
    // Xóa sạch RAM để dọn rác và ép Khởi Động Nguội cho lần sau.
    if (data.isActive === false) {
        itemManagerService.clearCache(Number(id));
        
        // [COMMENT: Đã tắt DB lưu Item nên không cần deleteMany nữa]
        /*
        prisma.item.deleteMany({
            where: { categoryId: Number(id) }
        }).catch(err => console.error(`❌ Lỗi dọn rác DB cho category ${id}:`, err));
        */
    }

    triggerReloadCategories();

    return category;
};

/**
 * 👑 Admin: Lấy tất cả Categories của mọi User (kèm thông tin user sở hữu)
 * @returns {Promise<Array>} Danh sách tất cả category
 */
  async getAllCategoriesAdmin() {
    return prisma.category.findMany({
        orderBy: { id: 'desc' },
        // Kèm thông tin user sở hữu để admin biết category này thuộc ai
        include: {
            user: {
                select: { id: true, username: true }
            }
        }
    });
  }
}

export default new CategoryService();
