import React from 'react';
import './StatusBadge.scss';

export const StatusBadge = ({ status, text }) => {
    // status can be: active, paused, default
    return (
        <span className={`status-badge status-${status}`}>
            {text}
        </span>
    );
};
