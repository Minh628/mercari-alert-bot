import React from 'react';
import './ToggleSwitch.scss';

export const ToggleSwitch = ({ checked, onChange, defaultChecked }) => {
    return (
        <label className="switch">
            <input 
                type="checkbox" 
                checked={checked} 
                onChange={onChange} 
                defaultChecked={defaultChecked} 
            />
            <span className="slider"></span>
        </label>
    );
};
