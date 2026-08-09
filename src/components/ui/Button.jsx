import React from 'react';

const Button = ({ children, className = '', variant = 'primary', ...props }) => {
  const baseClass = variant === 'primary' ? 'btn-primary' : 'btn';
  
  return (
    <button 
      className={`${baseClass} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
