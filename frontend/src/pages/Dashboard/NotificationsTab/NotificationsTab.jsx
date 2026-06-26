import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/common/Card/Card';
import { InputField } from '../../../components/common/InputField/InputField';
import { Button } from '../../../components/common/Button/Button';
import { ToggleSwitch } from '../../../components/common/ToggleSwitch/ToggleSwitch';
import { LogBox } from '../../../components/common/LogBox/LogBox';
import { userService } from '../../../services/user.service';
import { toast } from 'sonner';
import './NotificationsTab.scss';

export const NotificationsTab = () => {
    const [telegramId, setTelegramId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

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

    const logs = [
        { time: new Date().toLocaleTimeString(), level: 'info', message: 'Hệ thống Notification đã sẵn sàng.' }
    ];

    return (
        <div className="notifications-tab">
            <div className="grid-2col">
                <div className="left-column">
                    <Card title="Telegram Webhook Setup">
                        <InputField label="Telegram Bot Token" value="Sẽ được cấu hình bởi Admin" disabled />
                        
                        <InputField 
                            label="Your Telegram Chat ID" 
                            placeholder="Ví dụ: 987654321" 
                            value={telegramId}
                            onChange={(e) => setTelegramId(e.target.value)}
                            disabled={isFetching}
                        />
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '20px 0' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>Bật / Tắt thông báo</span>
                            <ToggleSwitch defaultChecked />
                        </div>
                        
                        <Button variant="primary" fullWidth onClick={handleSave} disabled={isLoading || isFetching}>
                            {isLoading ? 'Đang lưu...' : 'Lưu cài đặt'}
                        </Button>
                    </Card>
                </div>
                <div className="right-column">
                    <Card title="Notification History">
                        <LogBox logs={logs} tall />
                    </Card>
                </div>
            </div>
        </div>
    );
};
