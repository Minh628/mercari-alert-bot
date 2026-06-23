import itemService from './item.service.js';

class ItemController {
  // 🔑 Xem items của 1 category (user chỉ xem category của mình)
  async getItemsByCategory(req, res, next) {
    try {
      const userId = req.user.id;
      const { categoryId } = req.params;
      const result = await itemService.getItemsByCategory(categoryId, userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // 👑 Admin: Xem thống kê tổng số Items
  async getStats(req, res, next) {
    try {
      const stats = await itemService.getStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  // 👑 Admin: Dọn dẹp Items cũ
  async cleanup(req, res, next) {
    try {
      // Cho phép truyền query ?days=7 để tuỳ chỉnh số ngày
      const daysOld = parseInt(req.query.days, 10) || 7;
      const result = await itemService.cleanup(daysOld);
      res.status(200).json({ success: true, data: result, message: `Đã dọn dẹp ${result.deletedCount} items cũ` });
    } catch (error) {
      next(error);
    }
  }
}

export default new ItemController();
