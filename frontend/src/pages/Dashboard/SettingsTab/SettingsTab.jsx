import React, { useState } from 'react';
import { Card } from '../../../components/common/Card/Card';
import { InputField } from '../../../components/common/InputField/InputField';
import { Button } from '../../../components/common/Button/Button';
import { userService } from '../../../services/user.service';
import { toast } from 'sonner';
import './SettingsTab.scss';

export const SettingsTab = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleUpdatePassword = async () => {
        if (!password || !confirmPassword) {
            toast.error("Vui lòng điền đầy đủ mật khẩu mới!");
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Mật khẩu xác nhận không khớp!");
            return;
        }

        setIsLoading(true);
        try {
            await userService.updateProfile({ password });
            toast.success("Cập nhật mật khẩu thành công!");
            setPassword('');
            setConfirmPassword('');
        } catch (error) {
            // Lỗi đã được xử lý ở interceptor
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="settings-tab">
            <div className="grid-2col">
                <div className="left-column">
                    <Card title="Thay đổi mật khẩu">
                        <InputField 
                            label="Mật khẩu mới" 
                            type="password" 
                            placeholder="Nhập mật khẩu mới" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <InputField 
                            label="Xác nhận mật khẩu" 
                            type="password" 
                            placeholder="Nhập lại mật khẩu mới" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        
                        <div style={{ marginTop: '20px' }}>
                            <Button variant="primary" fullWidth onClick={handleUpdatePassword} disabled={isLoading}>
                                {isLoading ? 'Đang cập nhật...' : 'Cập nhật Mật khẩu'}
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
