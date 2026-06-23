import React from 'react';
import { Button } from '../../common/Button/Button';
import './Header.scss';

export const Header = ({ title }) => {
    return (
        <div className="header">
            <div className="header-title">{title}</div>
            <Button variant="primary" className="login-btn">Log In</Button>
        </div>
    );
};
