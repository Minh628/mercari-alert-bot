import userService from './user.service.js';

class UserController {
  // 👑 Admin tạo tài khoản mới
  async register(req, res, next) {
    try {
      const user = await userService.registerUser(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  // 🔓 Đăng nhập
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const result = await userService.loginUser(username, password);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // 🔑 Xem profile bản thân
  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await userService.getUserById(userId);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  // 👤 Member tự đổi password / telegramId
  async updateSelfProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await userService.updateSelfProfile(userId, req.body);
      res.status(200).json({ success: true, data: user, message: 'Cập nhật profile thành công' });
    } catch (error) {
      next(error);
    }
  }

  // 👑 Admin: Xem danh sách tất cả Users
  async getAllUsers(req, res, next) {
    try {
      const users = await userService.getAllUsers();
      res.status(200).json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  // 👑 Admin: Sửa thông tin User bất kỳ
  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userService.updateUser(id, req.body);
      res.status(200).json({ success: true, data: user, message: 'Cập nhật User thành công' });
    } catch (error) {
      next(error);
    }
  }

  // 👑 Admin: Xoá User
  async deleteAccount(req, res, next) {
    try {
      const { id } = req.params;
      await userService.deleteUser(id);
      res.status(200).json({ success: true, data: null, message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
