import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.scss';

export const Sidebar = () => {
    return (
        <div className="sidebar">
            <div className="logo">MERCARI BOT</div>
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
                Dashboard
            </NavLink>
            <NavLink to="/follows" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                Search Configs
            </NavLink>
            <NavLink to="/notifications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                Notifications
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                Settings
            </NavLink>
        </div>
    );
};
