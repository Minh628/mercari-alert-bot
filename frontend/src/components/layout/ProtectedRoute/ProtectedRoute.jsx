import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'sonner';

export const ProtectedRoute = () => {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        // Nếu chưa đăng nhập, đá về trang login và hiển thị thông báo
        toast.error("Vui lòng đăng nhập để truy cập tính năng này!");
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
