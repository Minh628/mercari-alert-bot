

class ItemManagerService {
  constructor() {
    // RAM Cache: Map<FollowId, Set<ItemId>>
    // Sử dụng Set để O(1) lookup và kiểm tra số lượng (size) nhanh chóng.
    this.cache = new Map();

    // Cờ báo hiệu quá trình xóa (evict) đang diễn ra cho từng follow.
    // Tránh trường hợp gọi quá trình xóa nhiều lần đồng thời dẫn đến race condition (Thread-safe).
    this.isEvicting = new Map(); // Map<FollowId, Boolean>
  }

  /**
   * Khởi tạo cache cho follow nếu chưa tồn tại
   * @param {number} followId 
   */
  _initCache(followId) {
    if (!this.cache.has(followId)) {
      this.cache.set(followId, new Set());
    }
  }

  /**
   * Xử lý item mới: Check cache O(1), đẩy vào RAM cache và xử lý trượt (Sliding Window)
   * @param {number} followId - ID của Follow trong Database
   * @param {string} mercariItemId - ID của item trên Mercari (ví dụ: m1234567)
   * @returns {Promise<boolean>} true nếu là item mới, false nếu trùng lặp
   */
  async processNewItem(followId, mercariItemId) {
    this._initCache(followId);
    const followCache = this.cache.get(followId);

    // 1. O(1) Check: Kiểm tra sự tồn tại trong RAM cache
    if (followCache.has(mercariItemId)) {
      return false; // Đã tồn tại, bỏ qua, không cần lưu DB
    }

    // 2. Thêm vào RAM cache (Tắt DB để giảm tải Neon Serverless)
    followCache.add(mercariItemId);
    


    // 3. SLIDING WINDOW (Luật 10000/9850): Nếu số lượng item trong RAM của follow vượt quá 10000
    if (followCache.size > 10000) {
      // Đảm bảo tại một thời điểm chỉ có 1 tiến trình evict cho mỗi follow
      if (!this.isEvicting.get(followId)) {
        this.isEvicting.set(followId, true);

        // Tiến trình evict chạy ngầm (write-behind), không block thời gian trả về của hàm.
        this._evictOldItems(followId, followCache)
          .catch(err => console.error(`[ItemManager] Lỗi evict cho follow ${followId}:`, err))
          .finally(() => {
            this.isEvicting.set(followId, false); // Giải phóng cờ báo hiệu sau khi xong
          });
      }
    }

    // 4. Trả về true (Item mới hoàn toàn, an toàn để gửi cảnh báo)
    return true;
  }

  /**
   * Xóa các items cũ nhất khỏi DB & RAM (Đưa tổng số lượng về mức an toàn 150)
   * @param {number} followId 
   * @param {Set<string>} followCache 
   */
  async _evictOldItems(followId, followCache) {
    // Tính số lượng cần xóa để RAM và DB hạ xuống mốc 150 (trừ hao phình to nếu có).
    const deleteCount = Math.max(0, followCache.size - 150);
    if (deleteCount === 0) return;


    // Vì Set trong Javascript bảo toàn Insertion Order (phần tử thêm đầu tiên sẽ ở đầu).
    // Ta chỉ cần pop `deleteCount` phần tử từ trên đầu Set xuống.
    const iterator = followCache.values();
    for (let i = 0; i < deleteCount; i++) {
      const oldestItem = iterator.next().value;
      if (oldestItem) {
        followCache.delete(oldestItem);
      }
    }
  }

  /**
   * Nạp (preload) cache từ DB vào RAM khi server khởi động.
   * Giúp chống cold start và đồng bộ số lượng RAM so với DB hiện tại.
   * @param {number} followId 
   */
  async preloadCache(followId) {
    // RAM trống = size 0 = Cold Start = Bot tự động nạp mốc mà không Spam Telegram.
    this._initCache(followId);
  }

  /**
   * Khởi động nguội: Xóa sạch bộ đệm RAM của follow này khi người dùng tắt (Pause)
   * Để lần sau bật lại (Resume), hệ thống sẽ tính là lượt đầu tiên và im lặng cào lại DB
   * @param {number} followId 
   */
  clearCache(followId) {
    if (this.cache.has(followId)) {
      this.cache.delete(followId);
    }
  }
}

export default new ItemManagerService();
