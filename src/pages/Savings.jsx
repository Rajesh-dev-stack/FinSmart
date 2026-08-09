import { useState, useEffect } from 'react';
import { getUser, transferToSavings, transferFromSavings, getInterestTransactions, setSavingsGoal } from '../firebase/dbFunctions';
import { useTheme } from '../context/ThemeProvider';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

const SpinnerInline = ({ size = 28 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    border: '3px solid rgba(0,201,167,0.15)',
    borderTop: '3px solid #00C9A7',
    animation: 'spin 0.8s linear infinite',
    margin: 'auto'
  }} />
);

const Savings = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [savingsData, setSavingsData] = useState(null);
  const [txns, setTxns] = useState([]);
  
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDirection, setTransferDirection] = useState('to'); // 'to' or 'from'
  const [transferring, setTransferring] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  
  const [projectorAmount, setProjectorAmount] = useState(10000);
  const [goalAmount, setGoalAmount] = useState('');
  const [weeklyTarget, setWeeklyTarget] = useState('');
  const [savingGoalMsg, setSavingGoalMsg] = useState('');
  const [settingGoal, setSettingGoal] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const loadData = async () => {
    if (!user) return;
    try {
      const uDoc = await getUser(user.uid);
      if (uDoc) {
        setWalletBalance(uDoc.walletBalance || 0);
        setSavingsData(uDoc.savings || { balance: 0, totalInterestEarned: 0 });
      }
      const interestLogs = await getInterestTransactions(user.uid);
      setTxns(interestLogs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    setMsg({ text: '', type: '' });
    const amt = parseFloat(transferAmount);
    
    if (isNaN(amt) || amt <= 0) {
      return setMsg({ text: 'Enter a valid amount', type: 'error' });
    }
    if (transferDirection === 'to' && amt < 100) {
      return setMsg({ text: 'Minimum transfer to savings is ₹100', type: 'error' });
    }
    
    setTransferring(true);
    try {
      if (transferDirection === 'to') {
        await transferToSavings(user.uid, amt);
        setMsg({ text: `Successfully moved ₹${amt} to Savings!`, type: 'success' });
      } else {
        await transferFromSavings(user.uid, amt);
        setMsg({ text: `Successfully withdrew ₹${amt} from Savings!`, type: 'success' });
      }
      setTransferAmount('');
      loadData();
    } catch (err) {
      setMsg({ text: err.message || 'Transfer failed', type: 'error' });
    } finally {
      setTransferring(false);
    }
  };

  const handleSetGoal = async (e) => {
    e.preventDefault();
    setSavingGoalMsg('');
    const ga = parseFloat(goalAmount);
    const wt = parseFloat(weeklyTarget);
    if (isNaN(ga) || ga <= 0 || isNaN(wt) || wt <= 0) {
      return setSavingGoalMsg('Enter valid amounts.');
    }
    setSettingGoal(true);
    try {
      await setSavingsGoal(user.uid, ga, wt);
      setSavingGoalMsg('Goals updated successfully! 🌱');
      loadData();
    } catch (err) {
      setSavingGoalMsg('Failed to update goals.');
    } finally {
      setSettingGoal(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <SpinnerInline />
        </div>
      </div>
    );
  }

  const balance = savingsData?.balance || 0;
  const totalInterest = savingsData?.totalInterestEarned || 0;
  const dailyRate = 0.06 / 365;
  const interestToday = balance * dailyRate;
  const interestMonth = balance * dailyRate * 30; // rough estimate for display
  const interestYearly = balance * 0.06;

  // Projector Math
  const P = projectorAmount;
  const A1 = P * Math.pow(1 + dailyRate, 30);
  const A6 = P * Math.pow(1 + dailyRate, 182);
  const A12 = P * Math.pow(1 + dailyRate, 365);
  const A36 = P * Math.pow(1 + dailyRate, 1095);

  // Chart Setup
  const chartLabels = txns.slice(0, 14).reverse().map(t => new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
  const chartDataPoints = txns.slice(0, 14).reverse().map(t => t.balanceAfter);
  
  const chartData = {
    labels: chartLabels.length > 0 ? chartLabels : ['No Data'],
    datasets: [{
      label: 'Savings Balance',
      data: chartDataPoints.length > 0 ? chartDataPoints : [0],
      borderColor: '#00C9A7',
      backgroundColor: isDark ? 'rgba(0, 201, 167, 0.1)' : 'rgba(0, 201, 167, 0.2)',
      fill: true,
      tension: 0.3
    }]
  };
  
  const chartTextColor = isDark ? '#94a3b8' : '#718096';
  const chartGridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: chartTextColor } },
      y: { grid: { color: chartGridColor }, ticks: { color: chartTextColor } }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="page-content" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        
        {/* Top Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card" style={{ background: 'var(--primary)', color: '#fff' }}>
            <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>Current Savings Balance</p>
            <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0', color: '#fff' }}>₹{balance.toLocaleString(undefined, {maximumFractionDigits:2})}</h2>
            <p style={{ opacity: 0.9, fontSize: '0.85rem' }}>Earning 6% APY Compounded Daily</p>
          </div>
          
          <div className="card">
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Interest Earned Today</p>
            <h3 style={{ fontSize: '1.8rem', color: 'var(--primary)', margin: '0.5rem 0' }}>+₹{interestToday.toFixed(2)}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Projected Yearly: ₹{interestYearly.toFixed(2)}</p>
          </div>

          <div className="card">
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Interest Earned</p>
            <h3 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', margin: '0.5rem 0' }}>₹{totalInterest.toFixed(2)}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Est. This Month: ₹{interestMonth.toFixed(2)}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          {/* Transfer & Projection Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Transfer Card */}
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem' }}>Transfer Funds</h3>
              
              {msg.text && (
                <div style={{ padding: '0.75rem', borderRadius: 'var(--r-sm)', background: msg.type==='error'?'rgba(252,90,90,0.1)':'rgba(0,201,167,0.1)', color: msg.type==='error'?'var(--danger)':'var(--success)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                  {msg.text}
                </div>
              )}

              <form onSubmit={handleTransfer}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <button type="button" 
                    onClick={() => setTransferDirection('to')}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--r-sm)', background: transferDirection==='to' ? 'var(--primary)' : 'transparent', color: transferDirection==='to' ? '#fff' : 'var(--text-primary)', border: `1px solid ${transferDirection==='to' ? 'var(--primary)' : 'var(--border)'}`, transition: 'all 0.2s' }}>
                    Deposit to Savings
                  </button>
                  <button type="button" 
                    onClick={() => setTransferDirection('from')}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--r-sm)', background: transferDirection==='from' ? 'var(--primary)' : 'transparent', color: transferDirection==='from' ? '#fff' : 'var(--text-primary)', border: `1px solid ${transferDirection==='from' ? 'var(--primary)' : 'var(--border)'}`, transition: 'all 0.2s' }}>
                    Withdraw to Wallet
                  </button>
                </div>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Amount (Available: ₹{transferDirection === 'to' ? walletBalance.toLocaleString() : balance.toLocaleString()})
                  </label>
                  <input 
                    type="number" 
                    value={transferAmount} 
                    onChange={e => setTransferAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }}
                    required
                  />
                </div>
                
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={transferring}>
                  {transferring ? <SpinnerInline size={20} /> : (transferDirection === 'to' ? 'Move to Savings' : 'Withdraw to Wallet')}
                </button>
              </form>
            </div>

            {/* Savings Goal Tracker */}
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem' }}>Savings Goals 🎯</h3>
              {savingsData?.goal ? (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Goal Progress</span>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      ₹{balance.toLocaleString()} / ₹{savingsData.goal.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (balance / savingsData.goal) * 100)}%`, height: '100%', background: 'var(--gradient-primary)', transition: 'width 0.5s ease' }}></div>
                  </div>
                  <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Weekly Target: ₹{savingsData.weeklyTarget?.toLocaleString()}
                  </p>
                  
                  {savingsData.goalAchieved && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: 'var(--r-sm)', background: 'rgba(0,201,167,0.1)', color: 'var(--success)', fontSize: '0.9rem', textAlign: 'center' }}>
                      🎉 Goal Achieved! You earned 150 FinCoins!
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  Set a goal to unlock FinCoin rewards and track your progress!
                </p>
              )}

              <form onSubmit={handleSetGoal} style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '1rem' }}>{savingsData?.goal ? 'Update Goal' : 'Create Goal'}</h4>
                {savingGoalMsg && (
                  <p style={{ color: 'var(--primary)', fontSize: '0.9rem', marginBottom: '1rem' }}>{savingGoalMsg}</p>
                )}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total Goal (₹)</label>
                    <input type="number" value={goalAmount} onChange={e=>setGoalAmount(e.target.value)} placeholder={savingsData?.goal || "50000"} required style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Weekly Target (₹)</label>
                    <input type="number" value={weeklyTarget} onChange={e=>setWeeklyTarget(e.target.value)} placeholder={savingsData?.weeklyTarget || "1000"} required style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }} />
                  </div>
                </div>
                <button type="submit" className="btn btn-outline" style={{ width: '100%' }} disabled={settingGoal}>
                  {settingGoal ? 'Saving...' : 'Set Goals & Earn 🪙'}
                </button>
              </form>
            </div>

            {/* AI Growth Projector */}
            <div className="card">
              <h3 style={{ marginBottom: '0.5rem' }}>AI Growth Projector ✦</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>See how much your money will grow at 6% APY</p>
              
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>If you keep</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.2rem' }}>₹{projectorAmount.toLocaleString()}</span>
                </label>
                <input 
                  type="range" 
                  min="1000" max="1000000" step="1000"
                  value={projectorAmount}
                  onChange={e => setProjectorAmount(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>After 1 month</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>→ ₹{A1.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>After 6 months</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>→ ₹{A6.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>After 1 year</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>→ ₹{A12.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>After 3 years</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>→ ₹{A36.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chart & History Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card" style={{ flex: 1, minHeight: '300px' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Growth Chart</h3>
              {chartLabels.length > 0 ? (
                <div style={{ height: '80%' }}>
                  <Line data={chartData} options={chartOpts} />
                </div>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  No data yet. Deposit into savings to start growing!
                </div>
              )}
            </div>

            <div className="card" style={{ flex: 1 }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Recent Interest Payouts</h3>
              {txns.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {txns.slice(0, 5).map(txn => (
                    <div key={txn.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Interest Credited</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(txn.date).toLocaleDateString()} • {txn.daysCalculated} days</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 700, color: 'var(--primary)' }}>+₹{txn.amount.toFixed(2)}</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Balance: ₹{txn.balanceAfter.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Interest is calculated daily at midnight.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Savings;
