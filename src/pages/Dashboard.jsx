import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { getTransactions, getBudgets, getUser } from '../firebase/dbFunctions';
import { useTheme } from '../context/ThemeProvider';
import { auth } from '../firebase/firebaseClient';
import GlassCard from '../components/ui/GlassCard';
import './Dashboard.css';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

// ─── Mini Components ───────────────────────────────────────────
const SpinnerInline = () => (
  <div style={{
    width: 28, height: 28, borderRadius: '50%',
    border: '3px solid rgba(0,201,167,0.15)',
    borderTop: '3px solid #00C9A7',
    animation: 'spin 0.8s linear infinite',
    margin: '2rem auto'
  }} />
);

const TransactionRow = ({ txn }) => (
  <div className="dash-txn-row glass-card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', marginBottom: '0.5rem', border: '1px solid var(--border-subtle)' }}>
    <div className="dash-txn-avatar" style={{ background: 'var(--gradient-primary)', color: '#0A1628' }}>{txn.category?.[0] || '💳'}</div>
    <div className="dash-txn-info">
      <span className="dash-txn-name" style={{ color: 'var(--text-primary)' }}>{txn.description || txn.category}</span>
      <span className="dash-txn-date" style={{ color: 'var(--text-secondary)' }}>
        {txn.date ? new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
      </span>
    </div>
    <span className={`dash-txn-amount`} style={{ color: txn.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
      {txn.type === 'income' ? '+' : '-'}₹{(txn.amount || 0).toLocaleString()}
    </span>
  </div>
);

const BudgetBar = ({ label, spent, limit }) => {
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const over = pct >= 100;
  return (
    <div className="dash-budget-row">
      <div className="dash-budget-top">
        <span className="dash-budget-label">{label}</span>
        <span className={`dash-budget-val ${over ? 'over' : ''}`}>
          ₹{spent.toLocaleString()} / ₹{limit.toLocaleString()}
        </span>
      </div>
      <div className="dash-budget-track">
        <div className={`dash-budget-fill ${over ? 'over' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// Empty Chart Graphic
const EmptyChartPlaceholder = ({ text }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '0.5rem' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
    </svg>
    <p style={{ fontSize: '0.85rem' }}>{text}</p>
  </div>
);

// ─── Dashboard Page ─────────────────────────────────────────────
const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [incomeMonth, setIncomeMonth] = useState(0);
  const [expenseMonth, setExpenseMonth] = useState(0);
  const [lineData, setLineData] = useState(null);
  const [donutData, setDonutData] = useState(null);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) { setLoading(false); return; }
      try {
        const [userDoc, txns, buds] = await Promise.all([
          getUser(u.uid),
          getTransactions(u.uid),
          getBudgets(u.uid),
        ]);
        if (userDoc) setWalletBalance(userDoc.walletBalance || 0);
        setTransactions(txns || []);
        setBudgets(buds || []);

        const now = new Date();
        const cm = now.getMonth(), cy = now.getFullYear();
        let inc = 0, exp = 0;
        const catMap = {};
        const last6Inc = Array(6).fill(0);
        const last6Exp = Array(6).fill(0);

        (txns || []).forEach(t => {
          const d = t.date ? new Date(t.date) : new Date();
          const diff = (cy - d.getFullYear()) * 12 + (cm - d.getMonth());
          if (d.getMonth() === cm && d.getFullYear() === cy) {
            if (t.type === 'income') inc += t.amount || 0;
            else { exp += t.amount || 0; catMap[t.category] = (catMap[t.category] || 0) + (t.amount || 0); }
          }
          if (diff >= 0 && diff < 6) {
            if (t.type === 'income') last6Inc[5 - diff] += t.amount || 0;
            else last6Exp[5 - diff] += t.amount || 0;
          }
        });
        setIncomeMonth(inc);
        setExpenseMonth(exp);

        const months = [...Array(6)].map((_, i) => {
          const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
          return d.toLocaleString('default', { month: 'short' });
        });

        // Check if there's any data to show
        const hasData = last6Inc.some(v => v > 0) || last6Exp.some(v => v > 0);

        if (hasData) {
          setLineData({
            labels: months,
            datasets: [
              {
                label: 'Income', data: last6Inc,
                borderColor: '#00E676', backgroundColor: 'rgba(0,230,118,0.1)',
                tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#00E676',
              },
              {
                label: 'Expense', data: last6Exp,
                borderColor: '#FF5252', backgroundColor: 'rgba(255,82,82,0.1)',
                tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#FF5252',
              },
            ],
          });
        }

        const cats = Object.keys(catMap);
        if (cats.length > 0) {
          setDonutData({
            labels: cats,
            datasets: [{
              data: Object.values(catMap),
              backgroundColor: ['#00D4FF','#00E676','#7B61FF','#FFD740','#FF5252','#00B4A0','#FF6B9D','#40C4FF'],
              borderWidth: 0, hoverOffset: 6,
            }],
          });
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const totalBudget = budgets.reduce((a, b) => a + (b.limit || 0), 0);
  const totalSpent  = budgets.reduce((a, b) => a + (b.spent || 0), 0);
  const budgetPct   = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0;
  const savings     = incomeMonth - expenseMonth;

  const chartDefaults = {
    plugins: {
      legend: {
        labels: { color: 'rgba(255,255,255,0.7)', font: { family: 'Plus Jakarta Sans' } }
      },
      tooltip: {
        backgroundColor: 'rgba(13,33,55,0.95)',
        borderColor: 'rgba(0,212,255,0.3)', borderWidth: 1,
        titleColor: '#00D4FF', bodyColor: 'rgba(255,255,255,0.8)',
        padding: 12, cornerRadius: 12
      }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } }
    }
  };

  const chartBaseOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: chartDefaults.plugins.tooltip,
    },
  };

  const lineOpts = {
    ...chartBaseOpts,
    plugins: { ...chartBaseOpts.plugins, legend: { display: true, position: 'top', labels: chartDefaults.plugins.legend.labels } },
    scales: chartDefaults.scales,
  };

  const donutOpts = {
    ...chartBaseOpts,
    plugins: { ...chartBaseOpts.plugins, legend: { display: true, position: 'right', labels: chartDefaults.plugins.legend.labels } },
    cutout: '68%',
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <SpinnerInline />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      
      <div className="page-content dashboard">
        <div className="page-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem' }}>{greeting}, {user?.displayName?.split(' ')[0] || 'User'}! 👋</h1>
            <p className="text-secondary" style={{ fontSize: '0.95rem' }}>Here's your summary for {dateStr}</p>
          </div>
        </div>

        {/* ─── Stat Cards Row ─── */}
        <div className="dash-stats">
          <GlassCard className="dash-stat-card stat-card" style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,212,255,0.05))', borderTop: '1px solid var(--accent-primary)' }}>
            <div className="dash-stat-icon" style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent-primary)' }}>₹</div>
            <div>
              <p className="dash-stat-label">Total Balance</p>
              <p className="dash-stat-val">₹{walletBalance.toLocaleString()}</p>
            </div>
          </GlassCard>
          <GlassCard className="dash-stat-card stat-card" style={{ background: 'linear-gradient(135deg, rgba(0,230,118,0.15), rgba(0,230,118,0.05))', borderTop: '1px solid var(--success)' }}>
            <div className="dash-stat-icon" style={{ background: 'rgba(0,230,118,0.1)', color: 'var(--success)' }}>↑</div>
            <div>
              <p className="dash-stat-label">Monthly Income</p>
              <p className="dash-stat-val" style={{ color: 'var(--success)' }}>₹{incomeMonth.toLocaleString()}</p>
            </div>
          </GlassCard>
          <GlassCard className="dash-stat-card stat-card" style={{ background: 'linear-gradient(135deg, rgba(255,82,82,0.15), rgba(255,82,82,0.05))', borderTop: '1px solid var(--danger)' }}>
            <div className="dash-stat-icon" style={{ background: 'rgba(255,82,82,0.1)', color: 'var(--danger)' }}>↓</div>
            <div>
              <p className="dash-stat-label">Monthly Expenses</p>
              <p className="dash-stat-val" style={{ color: 'var(--danger)' }}>₹{expenseMonth.toLocaleString()}</p>
            </div>
          </GlassCard>
          <GlassCard className="dash-stat-card stat-card" style={{ background: 'linear-gradient(135deg, rgba(123,97,255,0.15), rgba(123,97,255,0.05))', borderTop: '1px solid var(--accent-purple)' }}>
            <div className="dash-stat-icon" style={{ background: 'rgba(123,97,255,0.1)', color: 'var(--accent-purple)' }}>🛡</div>
            <div>
              <p className="dash-stat-label">Savings</p>
              <p className="dash-stat-val" style={{ color: savings >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                ₹{Math.abs(savings).toLocaleString()}
              </p>
            </div>
          </GlassCard>
        </div>

        {/* ─── Main Grid ─── */}
        <div className="dash-grid">

          {/* All Transactions Widget */}
          <GlassCard className="dash-widget">
            <div className="dash-widget-header">
              <h3>All Transactions</h3>
              <button className="dash-widget-add" onClick={() => navigate('/transactions', { state: { openAdd: true } })}>+</button>
            </div>
            {transactions.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '1rem' }}>No transactions yet.</p>
            ) : (
              <div className="dash-txn-list">
                {transactions.slice(0, 4).map(t => <TransactionRow key={t.id} txn={t} />)}
              </div>
            )}
          </GlassCard>

          {/* Reports Widget */}
          <GlassCard className="dash-widget">
            <div className="dash-widget-header">
              <h3>Reports</h3>
              <button className="dash-widget-add" onClick={() => navigate('/reports')}>+</button>
            </div>
            <div className="dash-reports-summary">
              <div>
                <p className="text-muted" style={{ fontSize: '0.75rem' }}>Worth</p>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#00C9A7' }}>₹{walletBalance.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.75rem' }}>Spent</p>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#FC5A5A' }}>₹{expenseMonth.toLocaleString()}</p>
              </div>
            </div>
            <div style={{ height: 90, marginTop: '0.75rem' }}>
              {lineData ? (
                <Line data={lineData} options={{
                  ...chartBaseOpts,
                  scales: { x: { display: false }, y: { display: false } },
                }} />
              ) : (
                <EmptyChartPlaceholder text="No data to report" />
              )}
            </div>
          </GlassCard>

          {/* Budget Widget */}
          <GlassCard className="dash-widget">
            <div className="dash-widget-header">
              <h3>Budget</h3>
              <button className="dash-widget-add" onClick={() => navigate('/budget')}>+</button>
            </div>
            {budgets.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '1rem' }}>No budgets set.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                {budgets.slice(0, 3).map(b => (
                  <BudgetBar key={b.category} label={b.category} spent={b.spent || 0} limit={b.limit} />
                ))}
              </div>
            )}
          </GlassCard>

          {/* Income vs Expense Chart */}
          <GlassCard className="dash-widget dash-widget-wide">
            <div className="dash-widget-header">
              <h3>Income vs Expenses</h3>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>Last 6 months</span>
            </div>
            <div style={{ height: 180, marginTop: '0.75rem' }}>
              {lineData ? (
                <Line data={lineData} options={lineOpts} />
              ) : (
                <EmptyChartPlaceholder text="Add transactions to see trends" />
              )}
            </div>
          </GlassCard>

          {/* Spending by Category Donut */}
          <GlassCard className="dash-widget">
            <div className="dash-widget-header">
              <h3>By Category</h3>
            </div>
            <div style={{ height: 180, marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {donutData ? (
                <Doughnut data={donutData} options={donutOpts} />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', opacity: 0.5 }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🍩</div>
                  Add expenses to see breakdown
                </div>
              )}
            </div>
          </GlassCard>

          {/* Budget Summary */}
          <GlassCard className="dash-widget">
            <div className="dash-widget-header">
              <h3>Budget Used</h3>
            </div>
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <div className="dash-circle-progress">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(0,201,167,0.1)" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={budgetPct >= 100 ? '#FC5A5A' : '#00C9A7'}
                    strokeWidth="10"
                    strokeDasharray={`${(budgetPct / 100) * 251.2} 251.2`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dasharray 0.8s ease' }}
                  />
                  <text x="50" y="54" textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--text-primary)">{budgetPct}%</text>
                </svg>
              </div>
              <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: '0.5rem' }}>
                ₹{totalSpent.toLocaleString()} of ₹{totalBudget.toLocaleString()}
              </p>
            </div>
          </GlassCard>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;

