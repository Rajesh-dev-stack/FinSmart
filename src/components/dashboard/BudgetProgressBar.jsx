const BudgetProgressBar = ({ category, spent, limit }) => {
  const percentage = Math.min((spent / limit) * 100, 100) || 0;
  
  // Determine color based on usage
  let progressColor = 'var(--success)'; // Green
  if (percentage >= 90) progressColor = 'var(--danger)'; // Red
  else if (percentage >= 75) progressColor = 'var(--warning)'; // Yellow

  return (
    <div className="budget-progress-container">
      <div className="budget-header">
        <span className="budget-category">{category}</span>
        <span className="budget-amounts">
          <strong>{spent.toFixed(2)}</strong> / {limit.toFixed(2)}
        </span>
      </div>
      
      <div className="progress-bar-bg">
        <div 
          className="progress-bar-fill" 
          style={{ 
            width: `${percentage}%`,
            backgroundColor: progressColor
          }}
        ></div>
      </div>
      
      <div className="budget-footer">
        <span className="budget-remaining">
          {Math.max(limit - spent, 0).toFixed(2)} remaining
        </span>
        <span className="budget-percentage">
          {percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
};

export default BudgetProgressBar;
