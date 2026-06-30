import React from 'react';
import './Card.scss';

export const Card = ({ title, extra, children, className = '' }) => {
    return (
        <div className={`card ${className}`}>
            {(title || extra) && (
                <div className="card-title">
                    {title}
                    {extra && <div>{extra}</div>}
                </div>
            )}
            <div className="card-content">
                {children}
            </div>
        </div>
    );
};
