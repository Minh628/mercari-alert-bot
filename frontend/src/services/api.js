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

// Tự động gắn token vào mỗi request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Tự động hiển thị lỗi global và xử lý 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Có lỗi kết nối máy chủ!';
    
    if (status === 401) {
        // Token hết hạn hoặc không hợp lệ -> xóa token và đá về login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Tránh loop vô hạn nếu đang ở trang login
        if (window.location.pathname !== '/login') {
            toast.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!');
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
        }
    } else {
        toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

export default api;
