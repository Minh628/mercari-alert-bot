import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { authService } from '../services/auth.service';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Khôi phục trạng thái đăng nhập từ localStorage khi reload trang
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const data = await authService.login(username, password);
            if (data.success && data.data) {
                const { token, user } = data.data;
                // Lưu vào state React
                setToken(token);
                setUser(user);
                setIsAuthenticated(true);
                // Lưu vào localStorage
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                return true;
            }
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    if (loading) {
        return null; // Hoặc một loading spinner
    }

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
