import React, { useState } from 'react';
import api from '../services/api';
import { Button } from '../components/common/Button';

const Dashboard = () => {
    const [keyword, setKeyword] = useState('');
    const [statusText, setStatusText] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault(); // Ngăn trình duyệt reload lại trang
        setStatusText('Đang gửi lệnh...');

        try {
            // GỌI API: Bắn chữ khách gõ sang Backend
            const response = await api.post('/keywords', { keyword: keyword });

            // Nhận kết quả thành công từ Express Controller
            setStatusText(`✅ ${response.data.message}`);
            setKeyword(''); // Xóa trắng ô input
        } catch (error) {
            setStatusText(`❌ Lỗi: ${error.response?.data?.error || error.message}`);
        }
    };

    return (

        <div style={{ padding: '50px', fontFamily: 'Arial' }}>
            <h2>🎯 Hệ Thống Săn Hàng Mercari</h2>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Nhập tên sản phẩm (VD: adidas)"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    style={{ padding: '10px', fontSize: '16px', width: '300px' }}
                />
                <Button
                    type="submit"
                    style={{ padding: '10px 20px', fontSize: '16px', marginLeft: '10px', cursor: 'pointer' }}
                >
                    Đưa vào tầm ngắm
                </Button>
            </form>

            <p style={{ marginTop: '20px', fontWeight: 'bold', color: 'blue' }}>
                {statusText}
            </p>
        </div>
    );
};

export default Dashboard;
