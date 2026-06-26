import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../common/Button/Button';
import { useAuth } from '../../../contexts/AuthContext';
import './Header.scss';

export const Header = ({ title }) => {
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="header">
            <div className="header-title">{title}</div>
            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {isAuthenticated ? (
                    <>
                        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            Xin chào, <strong style={{ color: 'var(--text-main)' }}>{user?.username}</strong>
                        </span>
                        <Button variant="outline" onClick={logout}>Log Out</Button>
                    </>
                ) : (
                    <Button variant="primary" className="login-btn" onClick={() => navigate('/login')}>Log In</Button>
                )}
            </div>
        </div>
    );
};
