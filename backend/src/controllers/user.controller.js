import userService from '../services/user.service.js';

class UserController {
  async register(req, res, next) {
    try {
      const user = await userService.registerUser(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const result = await userService.loginUser(username, password);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await userService.getUserById(userId);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

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
