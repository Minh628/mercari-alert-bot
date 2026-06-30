import api from './api';

export const followService = {
  // Lấy toàn bộ danh sách Follow của User hiện tại
  getAll: async () => {
    const response = await api.get('/api/follows');
    return response.data.follows; // Dựa trên format: { message: "...", follows: [...] }
  },

  // Tạo mới cấu hình tìm kiếm
  create: async (data) => {
    // data có thể chứa: keyword, category_id, brand_id, item_condition_id, status, price_min, price_max
    const response = await api.post('/api/follows', data);
    return response.data.follow;
  },

  // Cập nhật cấu hình (Bao gồm cả việc Bật/Tắt Bot thông qua isActive)
  update: async (id, data) => {
    const response = await api.put(`/api/follows/${id}`, data);
    return response.data;
  },

  // Xóa cấu hình theo ID
  delete: async (id) => {
    const response = await api.delete(`/api/follows/${id}`);
    return response.data;
  }
};
