const BalanceCard = ({ balance, income, expense, month, setMonth }) => {
  return (
    <div className="balance-card">
      <div className="balance-header">
        <h3>Total Balance</h3>
        <select 
          value={month} 
          onChange={(e) => setMonth && setMonth(e.target.value)}
          className="month-selector"
        >
          <option value="all">All Time</option>
          <option value="this-month">This Month</option>
          <option value="last-month">Last Month</option>
        </select>
      </div>
      
      <div className="balance-amount">
        <h2>₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
      </div>

      <div className="balance-summary">
        <div className="summary-item income">
          <span className="summary-icon">↓</span>
          <div>
            <p className="summary-label">Income</p>
            <p className="summary-value">₹{income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
        
        <div className="summary-divider"></div>
        
        <div className="summary-item expense">
          <span className="summary-icon">↑</span>
          <div>
            <p className="summary-label">Expense</p>
            <p className="summary-value">₹{expense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceCard;
