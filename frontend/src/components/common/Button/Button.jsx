import React from 'react';
import './Button.scss';

export const Button = ({ children, variant = 'primary', size = 'md', fullWidth = false, className = '', ...props }) => {
    return (
        <button 
            className={`btn variant-${variant} size-${size} ${fullWidth ? 'full-width' : ''} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
