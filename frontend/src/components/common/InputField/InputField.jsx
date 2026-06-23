import React from 'react';
import './InputField.scss';

export const InputField = ({ label, type = 'text', options, ...props }) => {
    return (
        <div className="input-field-wrapper">
            {label && <label>{label}</label>}
            
            {type === 'select' && options ? (
                <select {...props}>
                    {options.map((opt, idx) => (
                        <option key={idx} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            ) : (
                <input type={type} {...props} />
            )}
        </div>
    );
};
