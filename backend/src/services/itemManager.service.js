import prisma from '../config/prisma.js';

class ItemManagerService {
  constructor() {
    // RAM Cache: Map<CategoryId, Set<ItemId>>
    // Sử dụng Set để O(1) lookup và kiểm tra số lượng (size) nhanh chóng.
    this.cache = new Map();
    
    // Cờ báo hiệu quá trình xóa (evict) đang diễn ra cho từng category.
    // Tránh trường hợp gọi quá trình xóa nhiều lần đồng thời dẫn đến race condition (Thread-safe).
    this.isEvicting = new Map(); // Map<CategoryId, Boolean>
  }

  /**
   * Khởi tạo cache cho category nếu chưa tồn tại
   * @param {number} categoryId 
   */
  _initCache(categoryId) {
    if (!this.cache.has(categoryId)) {
      this.cache.set(categoryId, new Set());
    }
  }

  /**
   * Xử lý item mới: Check cache O(1), lưu DB, đẩy vào RAM cache và xử lý trượt (Sliding Window)
   * @param {number} categoryId - ID của Category trong Database
   * @param {string} mercariItemId - ID của item trên Mercari (ví dụ: m1234567)
   * @returns {Promise<boolean>} true nếu là item mới, false nếu trùng lặp
   */
  async processNewItem(categoryId, mercariItemId) {
    this._initCache(categoryId);
    const categoryCache = this.cache.get(categoryId);

    // 1. O(1) Check: Kiểm tra sự tồn tại trong RAM cache
    if (categoryCache.has(mercariItemId)) {
      return false; // Đã tồn tại, bỏ qua, không cần lưu DB
    }

    // 2. Lưu vào DB và thêm vào RAM cache (Composite Key: id + categoryId)
    try {
      await prisma.item.create({
        data: {
          id: mercariItemId,
          categoryId: categoryId
        }
      });
      // Chỉ push vào cache sau khi chắc chắn DB đã lưu thành công
      categoryCache.add(mercariItemId);
    } catch (error) {
      // Bắt lỗi Unique Constraint (P2002) của Prisma: 
      // Xảy ra khi có request khác vừa mới ghi cùng item vào DB cho cùng category.
      if (error.code === 'P2002') {
        categoryCache.add(mercariItemId); // Vẫn cập nhật vào RAM cache
        return false;
      }
      console.error(`[ItemManager] Lỗi lưu Database cho item ${mercariItemId}:`, error);
      throw error;
    }

    // 3. SLIDING WINDOW (Luật 1000/150): Nếu số lượng item trong RAM của category vượt quá 1000
    if (categoryCache.size > 1000) {
      // Đảm bảo tại một thời điểm chỉ có 1 tiến trình evict cho mỗi category
      if (!this.isEvicting.get(categoryId)) {
        this.isEvicting.set(categoryId, true);
        
        // Tiến trình evict chạy ngầm (write-behind), không block thời gian trả về của hàm.
        this._evictOldItems(categoryId, categoryCache)
          .catch(err => console.error(`[ItemManager] Lỗi evict cho category ${categoryId}:`, err))
          .finally(() => {
            this.isEvicting.set(categoryId, false); // Giải phóng cờ báo hiệu sau khi xong
          });
      }
    }

    // 4. Trả về true (Item mới hoàn toàn, an toàn để gửi cảnh báo)
    return true;
  }

  /**
   * Xóa 850 items cũ nhất khỏi DB & RAM (Composite Key: cần cả id + categoryId để xóa)
   * @param {number} categoryId 
   * @param {Set<string>} categoryCache 
   */
  async _evictOldItems(categoryId, categoryCache) {
    // Truy vấn DB lấy 850 items có thời gian tạo cũ nhất (tận dụng @@index([categoryId, createdAt]))
    const oldestItems = await prisma.item.findMany({
      where: { categoryId: categoryId },
      orderBy: { createdAt: 'asc' },
      take: 850,
      select: { id: true }
    });

    if (oldestItems.length === 0) return;

    const oldestItemIds = oldestItems.map(item => item.id);

    // Xóa hàng loạt từ DB bằng một query duy nhất để tiết kiệm DB I/O
    // Với Composite Key, deleteMany dùng where vẫn hoạt động bình thường
    await prisma.item.deleteMany({
      where: {
        id: { in: oldestItemIds },
        categoryId: categoryId // Đảm bảo an toàn, chỉ xóa đúng trong category này
      }
    });

    // Xóa đúng 850 items vừa tìm được ra khỏi RAM cache
    for (const itemId of oldestItems.map(item => item.id)) {
      categoryCache.delete(itemId);
    }
  }

  /**
   * Nạp (preload) cache từ DB vào RAM khi server khởi động.
   * Giúp chống cold start (khi khởi động lại, cache trống dễ gây lặp thông báo).
   * @param {number} categoryId 
   */
  async preloadCache(categoryId) {
    // Chỉ lấy 1000 item gần nhất
    const items = await prisma.item.findMany({
      where: { categoryId: categoryId },
      orderBy: { createdAt: 'desc' },
      take: 1000,
      select: { id: true }
    });
    
    this._initCache(categoryId);
    const categoryCache = this.cache.get(categoryId);
    for (const item of items) {
      categoryCache.add(item.id);
    }
  }
}

export default new ItemManagerService();
