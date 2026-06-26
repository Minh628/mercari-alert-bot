import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/common/Card/Card';
import { ToggleSwitch } from '../../../components/common/ToggleSwitch/ToggleSwitch';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'sonner';
import './WelcomeTab.scss';

export const WelcomeTab = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [botActive, setBotActive] = useState(true);

    const handleToggle = (e) => {
        if (!isAuthenticated) {
            toast.error("Vui lòng đăng nhập để thao tác bật/tắt BOT!");
            navigate('/login');
            return;
        }
        setBotActive(e.target.checked);
        toast.success(e.target.checked ? "BOT đã BẬT!" : "BOT đã TẮT!");
    };

    return (
        <div className="welcome-tab">
            <div className="hero">
                <h1>Hệ Thống Săn Hàng Tự Động Mercari</h1>
                <p>Nền tảng giúp bạn tự động theo dõi, quét liên tục và nhận thông báo ngay lập tức về Telegram khi có sản phẩm giá hời xuất hiện trên Mercari Nhật Bản.</p>
            </div>

            <div className="steps-grid">
                <div className="step-card">
                    <div className="step-number">1</div>
                    <div className="step-title">Thêm mục tiêu săn hàng</div>
                    <div className="step-desc">Chuyển sang tab <strong>Search Configs</strong> để thêm ID chuyên mục hoặc Từ khóa sản phẩm bạn muốn theo dõi.</div>
                </div>
                <div className="step-card">
                    <div className="step-number">2</div>
                    <div className="step-title">Thiết lập thông báo</div>
                    <div className="step-desc">Vào tab <strong>Notifications</strong> để liên kết với Telegram Bot. Hệ thống sẽ tự động bắn tin nhắn ngay giây phút sản phẩm xuất hiện.</div>
                </div>
                <div className="step-card">
                    <div className="step-number">3</div>
                    <div className="step-title">Chốt đơn nhanh chóng</div>
                    <div className="step-desc">Bấm vào link trực tiếp từ tin nhắn Telegram để mua hàng trên Mercari trước đối thủ. Hệ thống hoạt động 24/7.</div>
                </div>
            </div>

            <div className="grid-2col">
                <Card title="Tính năng nổi bật">
                    <ul className="feature-list">
                        <li><strong>Tốc độ siêu tốc:</strong> Cập nhật dữ liệu từ Mercari mỗi 10 giây (hoặc realtime).</li>
                        <li><strong>Chống Block IP:</strong> Hệ thống luân chuyển Proxy và Stealth Mode an toàn.</li>
                        <li><strong>Đa luồng:</strong> Quét đồng thời hàng chục Category và Keyword không giật lag.</li>
                    </ul>
                </Card>
                
                <Card 
                    title="Trạng thái BOT" 
                    extra={<ToggleSwitch checked={isAuthenticated ? botActive : false} onChange={handleToggle} />}
                >
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
                        {isAuthenticated && botActive ? 'Hệ thống Crawler Core đang chạy ngầm.' : 'Hệ thống hiện đang tạm dừng.'}
                    </p>
                    {isAuthenticated && botActive ? (
                        <div style={{ marginTop: 'auto', padding: '15px', background: 'rgba(0, 255, 128, 0.1)', border: '1px solid rgba(0, 255, 128, 0.2)', borderRadius: '12px', color: '#00ff80', fontSize: '14px', fontWeight: 600, textAlign: 'center' }}>
                            Active & Running
                        </div>
                    ) : (
                        <div style={{ marginTop: 'auto', padding: '15px', background: 'rgba(255, 51, 102, 0.1)', border: '1px solid rgba(255, 51, 102, 0.2)', borderRadius: '12px', color: '#ff3366', fontSize: '14px', fontWeight: 600, textAlign: 'center' }}>
                            Stopped
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
