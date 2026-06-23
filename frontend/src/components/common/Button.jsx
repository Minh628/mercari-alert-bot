import React from 'react';
import styles from './Button.module.scss';
import { Loader2 } from 'lucide-react';

/**
 * Component Button cơ bản với hỗ trợ variant và loading state.
 * @param {string} variant - 'primary' | 'secondary' | 'danger'
 * @param {boolean} isLoading - Hiển thị icon loading
 * @param {React.ReactNode} icon - Icon tuỳ chọn từ lucide-react
 */
export const Button = ({
  children,
  variant = 'primary',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClass = styles.btn;
  const variantClass = styles[variant] || styles.primary;
  
  return (
    <button
      className={`${baseClass} ${variantClass} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <Loader2 className={styles.spin} size={16} />}
      {!isLoading && icon && <span className={styles.iconWrapper}>{icon}</span>}
      {children}
    </button>
  );
};
