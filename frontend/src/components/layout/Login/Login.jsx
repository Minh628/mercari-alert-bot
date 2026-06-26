import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.scss';
import { Button } from '../../common/Button/Button';
import { InputField } from '../../common/InputField/InputField';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'sonner';

export const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const success = await login(username, password);
        setIsLoading(false);
        
        if (success) {
            toast.success('Đăng nhập thành công!');
            navigate('/');
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <h1>Chào mừng trở lại</h1>
                    <p>Đăng nhập để tiếp tục</p>
                </div>

                <form onSubmit={handleLogin} id="loginForm" className="login-form">
                    <div className="form-group">
                        <InputField
                            label="Username"
                            type="text"
                            placeholder="Nhập username của bạn"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <InputField
                            label="Mật khẩu"
                            type="password"
                            placeholder="Nhập mật khẩu"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <a href="#" className="forgot-password">Quên mật khẩu?</a>
                    </div>

                    <Button type="submit" className="btn-login" variant="primary" fullWidth disabled={isLoading}>
                        {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
                    </Button>
                </form>
            </div>
        </div>
    );
};
