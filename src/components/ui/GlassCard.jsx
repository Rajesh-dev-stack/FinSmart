import React from 'react';

const GlassCard = ({ children, className = '', delay = 0, ...props }) => {
  return (
    <div 
      className={`glass-card ${className}`} 
      style={{ animationDelay: `${delay}s`, ...props.style }}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
