import React from 'react';
import './ToggleSwitch.scss';

export const ToggleSwitch = ({ checked, onChange, defaultChecked, disabled }) => {
    return (
        <label className={`switch ${disabled ? 'disabled' : ''}`}>
            <input 
                type="checkbox" 
                checked={checked} 
                onChange={onChange} 
                defaultChecked={defaultChecked}
                disabled={disabled}
            />
            <span className="slider"></span>
        </label>
    );
};
