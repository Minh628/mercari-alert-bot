import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../Sidebar/Sidebar';
import { Header } from '../Header/Header';
import './MainLayout.scss';

export const MainLayout = () => {
    const location = useLocation();

    const getPageTitle = () => {
        switch (location.pathname) {
            case '/': return 'Welcome Dashboard';
            case '/follows': return 'Search Configs';
            case '/notifications': return 'System Notifications';
            case '/settings': return 'Bot Settings';
            default: return 'Dashboard';
        }
    };

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="main-content">
                <Header title={getPageTitle()} />
                <div className="container">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};
