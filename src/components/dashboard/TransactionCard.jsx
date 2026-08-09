import React from 'react';

const TransactionCard = ({ transaction }) => {
  const { type, amount, category, date, description } = transaction;
  const isIncome = type === 'income';
  
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: 'var(--r-md, 12px)',
      padding: '1rem',
      marginBottom: '0.75rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }} className="transaction-card-glass">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '1.2rem',
          background: isIncome ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 82, 82, 0.15)',
        }}>
          {isIncome ? '💰' : '🛒'}
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary, #fff)' }}>{category}</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary, #a0aec0)' }}>
            {description || (isIncome ? 'Received' : 'Payment')}
          </p>
        </div>
      </div>
      
      <div style={{ textAlign: 'right' }}>
        <p style={{ 
          margin: 0, 
          fontSize: '1rem', 
          fontWeight: 'bold',
          color: isIncome ? '#00E676' : '#FF5252' 
        }}>
          {isIncome ? '+' : '-'}₹{amount.toFixed(2)}
        </p>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted, #718096)' }}>
          {new Date(date).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default TransactionCard;
