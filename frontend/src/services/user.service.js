import api from './api';

export const userService = {
    getProfile: async () => {
        const response = await api.get('/api/users/profile');
        return response.data.data;
    },
    updateProfile: async (data) => {
        // data có thể là { password: 'new_pass' } hoặc { telegramId: 'new_id' }
        const response = await api.patch('/api/users/profile', data);
        return response.data.data;
    },
    // Bật/tắt bot - gửi isBotActive lên API
    updateBotStatus: async (isBotActive) => {
        const response = await api.patch('/api/users/profile', { isBotActive });
        return response.data.data;
    }
};
