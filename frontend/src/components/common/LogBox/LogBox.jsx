import React from 'react';
import './LogBox.scss';

export const LogBox = ({ logs = [], tall = false }) => {
    return (
        <div className={`log-box ${tall ? 'tall' : ''}`}>
            {logs.map((log, index) => (
                <div key={index} className="log-entry">
                    <span className="log-time">[{log.time}]</span>
                    <span className={`log-level-${log.level.toLowerCase()}`}>
                        {log.level.toUpperCase()}:
                    </span>
                    <span>{log.message}</span>
                </div>
            ))}
            {logs.length === 0 && <div style={{ color: '#555', fontStyle: 'italic' }}>No logs yet...</div>}
        </div>
    );
};
