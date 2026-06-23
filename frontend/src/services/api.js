import axios from 'axios';
import { toast } from 'sonner';

const api = axios.create({
    // Vercel sẽ tự lấy biến môi trường này để gọi tới API Render, mặc định fallback về localhost khi dev
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/', 
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 10000,
});

// Tự động hiển thị lỗi global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Có lỗi kết nối máy chủ!';
    toast.error(message);
    return Promise.reject(error);
  }
);

export default api;
