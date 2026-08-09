const StatCard = ({ icon, title, value, percentageChange, isPositive }) => {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div className="stat-icon-wrapper">{icon}</div>
        <h4 className="stat-title">{title}</h4>
      </div>
      <div className="stat-card-body">
        <h2 className="stat-value">{value}</h2>
        {percentageChange !== undefined && (
          <div className={`stat-change ${isPositive ? 'text-green' : 'text-red'}`}>
            <span className="change-icon">{isPositive ? '▲' : '▼'}</span>
            <span>{Math.abs(percentageChange)}% from last month</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
