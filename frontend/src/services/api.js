import axios from 'axios';

const api = axios.create({
    // Vercel sẽ tự lấy biến môi trường này để gọi tới API Render, mặc định fallback về localhost khi dev
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api', 
    headers: {
        'Content-Type': 'application/json'
    }
});

export default api;
