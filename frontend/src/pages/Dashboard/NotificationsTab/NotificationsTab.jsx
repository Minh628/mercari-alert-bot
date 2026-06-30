import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/common/Card/Card';
import { InputField } from '../../../components/common/InputField/InputField';
import { Button } from '../../../components/common/Button/Button';
import { userService } from '../../../services/user.service';
import { toast } from 'sonner';
import './NotificationsTab.scss';

export const NotificationsTab = () => {
    const [telegramId, setTelegramId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    // Lấy telegramId hiện tại từ profile user
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await userService.getProfile();
                if (data && data.telegramId) {
                    setTelegramId(data.telegramId);
                }
            } catch (error) {
                // Handled in interceptor
            } finally {
                setIsFetching(false);
            }
        };
        fetchProfile();
    }, []);

    const handleSave = async () => {
        if (!telegramId.trim()) {
            toast.error("Vui lòng nhập Telegram Chat ID!");
            return;
        }
        setIsLoading(true);
        try {
            await userService.updateProfile({ telegramId });
            toast.success("Đã cập nhật Telegram Chat ID thành công!");
        } catch (error) {
            // Handled
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="notifications-tab">
            {/* Khu vực cấu hình - single column, full width */}
            <div className="notifications-layout">
                {/* Card cài đặt chính */}
                <Card title="⚡ Telegram Webhook Setup" className="setup-card">
                    <div className="setup-content">
                        {/* Hiển thị thông tin bot name (readonly) */}
                        <div className="bot-info-row">
                            <div className="bot-info-label">
                                <span className="label-icon">🤖</span>
                                <span>Telegram Bot Name</span>
                            </div>
                            <div className="bot-name-badge">
                                Mercari-alert-Bot
                            </div>
                        </div>

                        {/* Input Chat ID */}
                        <div className="chat-id-section">
                            <InputField 
                                label="Your Telegram Chat ID" 
                                placeholder="Ví dụ: 987654321" 
                                value={telegramId}
                                onChange={(e) => setTelegramId(e.target.value)}
                                disabled={isFetching}
                            />
                        </div>
                        
                        <Button 
                            variant="primary" 
                            fullWidth 
                            onClick={handleSave} 
                            disabled={isLoading || isFetching}
                        >
                            {isLoading ? 'Đang lưu...' : '💾 Lưu cài đặt'}
                        </Button>
                    </div>
                </Card>

                {/* Card hướng dẫn step-by-step */}
                <Card title="📖 Hướng dẫn liên kết Telegram" className="guide-card">
                    <div className="guide-steps">
                        <div className="guide-step">
                            <div className="step-num">1</div>
                            <div className="step-content">
                                <div className="step-title">Mở Telegram &amp; tìm bot</div>
                                <div className="step-desc">
                                    Tìm kiếm <span className="highlight">@Mercari_alert_bot</span> trong Telegram hoặc bấm vào link được cung cấp bởi Admin.
                                </div>
                            </div>
                        </div>

                        <div className="guide-step">
                            <div className="step-num">2</div>
                            <div className="step-content">
                                <div className="step-title">Lấy Chat ID của bạn</div>
                                <div className="step-desc">
                                    Gửi lệnh <span className="code-tag">/start</span> cho bot, sau đó gửi <span className="code-tag">/id</span> để bot trả về Chat ID của bạn.
                                </div>
                            </div>
                        </div>

                        <div className="guide-step">
                            <div className="step-num">3</div>
                            <div className="step-content">
                                <div className="step-title">Dán vào ô Chat ID &amp; Lưu</div>
                                <div className="step-desc">
                                    Copy số Chat ID và dán vào ô <strong>"Your Telegram Chat ID"</strong> bên trái, nhấn Lưu để kích hoạt thông báo.
                                </div>
                            </div>
                        </div>

                        <div className="guide-step">
                            <div className="step-num">4</div>
                            <div className="step-content">
                                <div className="step-title">Bật BOT &amp; chờ thông báo</div>
                                <div className="step-desc">
                                    Quay lại tab <strong>Home</strong>, bật toggle <strong>"Trạng thái BOT"</strong>. Hệ thống sẽ gửi ngay khi có sản phẩm mới.
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
