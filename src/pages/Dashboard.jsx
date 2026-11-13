import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, TrendingDown, ShieldCheck, PieChart, Plus } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartJSTooltip,
  Legend as ChartJSLegend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { getTransactions, getBudgets, getUser } from '../firebase/dbFunctions';
import { auth } from '../firebase/firebaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Progress } from '../components/ui/Progress';
import { Avatar, AvatarFallback } from '../components/ui/Avatar';
import { formatINR, getInitials, cn } from '../lib/utils';
import './Dashboard.css';

ChartJS.register(ArcElement, ChartJSTooltip, ChartJSLegend);

// Mini Loading Spinner
const SpinnerInline = () => (
  <div style={{
    width: 28, height: 28, borderRadius: '50%',
    border: '3px solid rgba(0,201,167,0.15)',
    borderTop: '3px solid #00C9A7',
    animation: 'spin 0.8s linear infinite',
    margin: '2rem auto'
  }} />
);

// Transaction Row with shadcn Avatar
const TransactionRow = ({ txn }) => {
  const initials = getInitials(txn.description || txn.category);
  const isIncome = txn.type === 'income';
  const amountStr = formatINR(txn.amount || 0);

  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] transition-all mb-1.5">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className={cn("text-xs font-bold", isIncome ? "bg-[rgba(0,230,118,0.2)] text-[#00E676]" : "bg-[rgba(0,212,255,0.15)] text-[var(--accent-primary)]")}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-[var(--text-primary)] truncate">
            {txn.description || txn.category}
          </span>
          <span className="text-xs text-[rgba(255,255,255,0.65)] font-medium">
            {txn.date ? new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
          </span>
        </div>
      </div>
      <span className={cn("text-sm font-bold font-['Outfit',sans-serif] shrink-0 ml-2", isIncome ? "text-[#00E676]" : "text-[#FF5252]")}>
        {isIncome ? '+' : '-'}{amountStr}
      </span>
    </div>
  );
};

// Budget Progress Bar with shadcn Progress
const BudgetBar = ({ label, spent, limit }) => {
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const over = pct >= 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline text-xs">
        <span className="font-semibold text-[var(--text-primary)] truncate max-w-[140px]">{label}</span>
        <span className={cn("font-medium", over ? "text-[#FF5252]" : "text-[rgba(255,255,255,0.7)]")}>
          {formatINR(spent)} / {formatINR(limit)}
        </span>
      </div>
      <Progress value={pct} isOver={over} className="h-1.5" />
    </div>
  );
};

// Empty Chart Graphic Placeholder
const EmptyChartPlaceholder = ({ text }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5 }}>
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '0.5rem' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
    </svg>
    <p style={{ fontSize: '0.85rem' }}>{text}</p>
  </div>
);

// Custom Tooltip for Recharts with Indian Currency formatting
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-[rgba(0,212,255,0.3)] bg-[rgba(10,22,40,0.95)] p-3 shadow-2xl backdrop-blur-md">
        <p className="text-xs font-semibold text-[rgba(255,255,255,0.75)] mb-1.5">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="text-xs font-medium flex items-center justify-between gap-3 py-0.5" style={{ color: entry.color }}>
            <span>{entry.name}:</span>
            <span className="font-bold">{formatINR(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Dashboard Page Component
const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [incomeMonth, setIncomeMonth] = useState(0);
  const [expenseMonth, setExpenseMonth] = useState(0);
  const [chartFilter, setChartFilter] = useState('6 Month');
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

        (txns || []).forEach(t => {
          const d = t.date ? new Date(t.date) : new Date();
          if (d.getMonth() === cm && d.getFullYear() === cy) {
            if (t.type === 'income') inc += t.amount || 0;
            else { exp += t.amount || 0; catMap[t.category] = (catMap[t.category] || 0) + (t.amount || 0); }
          }
        });
        setIncomeMonth(inc);
        setExpenseMonth(exp);

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

  // Recharts formatted data for Income vs Expenses
  const rechartsData = useMemo(() => {
    if (!transactions || transactions.length === 0) return null;
    const now = new Date();
    let items = [];

    if (chartFilter === 'Day') {
      const dayLabels = [...Array(7)].map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return d.toLocaleDateString('en-IN', { weekday: 'short' });
      });
      const inc = Array(7).fill(0);
      const exp = Array(7).fill(0);
      transactions.forEach(t => {
        const d = new Date(t.date);
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          if (t.type === 'income') inc[6 - diffDays] += t.amount || 0;
          else exp[6 - diffDays] += t.amount || 0;
        }
      });
      items = dayLabels.map((name, i) => ({ name, Income: inc[i], Expense: exp[i] }));
    } else if (chartFilter === 'Week') {
      const weekLabels = ['Week 1', 'Week 2', 'Week 3', 'This Week'];
      const inc = Array(4).fill(0);
      const exp = Array(4).fill(0);
      transactions.forEach(t => {
        const d = new Date(t.date);
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        const diffWeeks = Math.floor(diffDays / 7);
        if (diffWeeks >= 0 && diffWeeks < 4) {
          if (t.type === 'income') inc[3 - diffWeeks] += t.amount || 0;
          else exp[3 - diffWeeks] += t.amount || 0;
        }
      });
      items = weekLabels.map((name, i) => ({ name, Income: inc[i], Expense: exp[i] }));
    } else if (chartFilter === 'Month') {
      const monthLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const inc = Array(4).fill(0);
      const exp = Array(4).fill(0);
      transactions.forEach(t => {
        const d = new Date(t.date);
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          const weekOfM = Math.min(Math.floor((d.getDate() - 1) / 7), 3);
          if (t.type === 'income') inc[weekOfM] += t.amount || 0;
          else exp[weekOfM] += t.amount || 0;
        }
      });
      items = monthLabels.map((name, i) => ({ name, Income: inc[i], Expense: exp[i] }));
    } else if (chartFilter === '6 Month') {
      const monthLabels = [...Array(6)].map((_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
        return d.toLocaleString('en-IN', { month: 'short' });
      });
      const inc = Array(6).fill(0);
      const exp = Array(6).fill(0);
      transactions.forEach(t => {
        const d = new Date(t.date);
        const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        if (diff >= 0 && diff < 6) {
          if (t.type === 'income') inc[5 - diff] += t.amount || 0;
          else exp[5 - diff] += t.amount || 0;
        }
      });
      items = monthLabels.map((name, i) => ({ name, Income: inc[i], Expense: exp[i] }));
    }

    const hasData = items.some(item => item.Income > 0 || item.Expense > 0);
    return hasData ? items : null;
  }, [transactions, chartFilter]);

  const totalBudget = budgets.reduce((a, b) => a + (b.limit || 0), 0);
  const totalSpent  = budgets.reduce((a, b) => a + (b.spent || 0), 0);
  const budgetPct   = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0;
  const savings     = incomeMonth - expenseMonth;

  const donutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: { color: 'rgba(255,255,255,0.7)', font: { family: 'Plus Jakarta Sans', size: 11 } }
      },
      tooltip: {
        backgroundColor: 'rgba(13,33,55,0.95)',
        borderColor: 'rgba(0,212,255,0.3)',
        borderWidth: 1,
        titleColor: '#00D4FF',
        bodyColor: 'rgba(255,255,255,0.8)',
        padding: 10,
        cornerRadius: 10,
        callbacks: {
          label: (item) => ` ${item.label}: ${formatINR(item.raw)}`
        }
      }
    },
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
        {/* Page Header */}
        <div className="page-header" style={{ marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: '1.85rem', color: '#FFFFFF', fontWeight: 700, margin: 0 }}>
              {greeting}, {user?.name?.split(' ')[0] || 'User'}!
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
              Here's your summary for {dateStr}
            </p>
          </div>
        </div>

        {/* 1. Stat Cards Row */}
        <div className="dash-stats">
          <Card className="bg-gradient-to-br from-[rgba(0,212,255,0.12)] to-[rgba(0,212,255,0.02)] border-t-2 border-t-[var(--accent-primary)] p-4 flex items-center gap-3.5 transition-all hover:-translate-y-0.5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[rgba(0,212,255,0.15)] text-[var(--accent-primary)] shrink-0">
              <Wallet size={22} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[rgba(255,255,255,0.65)] font-semibold">Total Balance</p>
              <p className="text-2xl font-bold font-['Outfit',sans-serif] text-[var(--text-primary)] mt-0.5">
                {formatINR(walletBalance)}
              </p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-[rgba(0,230,118,0.12)] to-[rgba(0,230,118,0.02)] border-t-2 border-t-[var(--success)] p-4 flex items-center gap-3.5 transition-all hover:-translate-y-0.5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[rgba(0,230,118,0.15)] text-[var(--success)] shrink-0">
              <TrendingUp size={22} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[rgba(255,255,255,0.65)] font-semibold">Monthly Income</p>
              <p className="text-2xl font-bold font-['Outfit',sans-serif] text-[var(--success)] mt-0.5">
                {formatINR(incomeMonth)}
              </p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-[rgba(255,82,82,0.12)] to-[rgba(255,82,82,0.02)] border-t-2 border-t-[var(--danger)] p-4 flex items-center gap-3.5 transition-all hover:-translate-y-0.5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[rgba(255,82,82,0.15)] text-[var(--danger)] shrink-0">
              <TrendingDown size={22} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[rgba(255,255,255,0.65)] font-semibold">Monthly Expenses</p>
              <p className="text-2xl font-bold font-['Outfit',sans-serif] text-[var(--danger)] mt-0.5">
                {formatINR(expenseMonth)}
              </p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-[rgba(123,97,255,0.12)] to-[rgba(123,97,255,0.02)] border-t-2 border-t-[var(--accent-purple)] p-4 flex items-center gap-3.5 transition-all hover:-translate-y-0.5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[rgba(123,97,255,0.15)] text-[var(--accent-purple)] shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[rgba(255,255,255,0.65)] font-semibold">Savings</p>
              <p className={cn("text-2xl font-bold font-['Outfit',sans-serif] mt-0.5", savings >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                {savings >= 0 ? '+' : '-'}{formatINR(Math.abs(savings))}
              </p>
            </div>
          </Card>
        </div>

        {/* Balanced 3x2 Main Grid */}
        <div className="dash-grid">

          {/* Row 1, Col 1-2: Hero Chart (Income vs Expense) */}
          <Card className="dash-widget dash-widget-wide">
            <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Income vs Expenses</CardTitle>
              <select 
                value={chartFilter} 
                onChange={(e) => setChartFilter(e.target.value)}
                style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.12)', 
                  color: 'var(--text-primary)', 
                  padding: '0.25rem 0.6rem', 
                  borderRadius: 'var(--r-sm)',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Day">Day (Last 7 Days)</option>
                <option value="Week">Week (Last 4 Weeks)</option>
                <option value="Month">Month (This Month)</option>
                <option value="6 Month">6 Months</option>
              </select>
            </CardHeader>
            <CardContent className="p-0 pt-1">
              <div style={{ height: 210, width: '100%' }}>
                {rechartsData ? (
                  <ResponsiveContainer width="100%" height={210}>
                    <AreaChart data={rechartsData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rechartsIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00E676" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#00E676" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="rechartsExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF5252" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#FF5252" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="rgba(255,255,255,0.3)" 
                        tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                      />
                      <YAxis 
                        stroke="rgba(255,255,255,0.3)" 
                        tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} 
                        tickFormatter={(val) => `₹${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Legend 
                        verticalAlign="top" 
                        align="right" 
                        iconType="circle"
                        wrapperStyle={{ paddingBottom: '6px', fontSize: '12px' }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Income" 
                        name="Income" 
                        stroke="#00E676" 
                        strokeWidth={2.5} 
                        fillOpacity={1} 
                        fill="url(#rechartsIncomeGrad)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Expense" 
                        name="Expense" 
                        stroke="#FF5252" 
                        strokeWidth={2.5} 
                        fillOpacity={1} 
                        fill="url(#rechartsExpenseGrad)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChartPlaceholder text="Add transactions to see trends" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Row 1, Col 3: Reports Summary */}
          <Card className="dash-widget">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-base font-semibold">Reports</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="dash-reports-summary">
                <div>
                  <p className="text-xs text-[rgba(255,255,255,0.65)] font-medium">Balance</p>
                  <p className="font-bold text-lg text-[#00C9A7] font-['Outfit',sans-serif]">{formatINR(walletBalance)}</p>
                </div>
                <div>
                  <p className="text-xs text-[rgba(255,255,255,0.65)] font-medium">Spent</p>
                  <p className="font-bold text-lg text-[#FC5A5A] font-['Outfit',sans-serif]">{formatINR(expenseMonth)}</p>
                </div>
              </div>
              <div style={{ height: 110, marginTop: '0.75rem' }}>
                {rechartsData ? (
                  <ResponsiveContainer width="100%" height={110}>
                    <AreaChart data={rechartsData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="sparkIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00C9A7" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#00C9A7" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="Income" stroke="#00C9A7" strokeWidth={2} fill="url(#sparkIncome)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChartPlaceholder text="No data to report" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Row 2, Col 1: All Transactions */}
          <Card className="dash-widget">
            <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
              <button 
                className="w-7 h-7 rounded-full bg-[rgba(0,201,167,0.15)] text-[#00C9A7] hover:bg-[#00C9A7] hover:text-[#0A1628] flex items-center justify-center transition-all cursor-pointer" 
                onClick={() => navigate('/transactions', { state: { openAdd: true } })}
                title="Add Transaction"
              >
                <Plus size={16} />
              </button>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <p className="text-[rgba(255,255,255,0.65)] text-xs text-center py-6">No transactions yet.</p>
              ) : (
                <div className="dash-txn-list">
                  {transactions.slice(0, 4).map(t => <TransactionRow key={t.id} txn={t} />)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Row 2, Col 2: Unified Budget Overview & Limits */}
          <Card className="dash-widget">
            <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Budget Overview</CardTitle>
              <span className="text-xs font-bold text-[#00C9A7]">{budgetPct}% Used</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex items-center gap-3 py-1 mb-2 border-b border-[rgba(255,255,255,0.06)] pb-2">
                <div className="shrink-0">
                  <svg width="48" height="48" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(0,201,167,0.12)" strokeWidth="10" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke={budgetPct >= 100 ? '#FC5A5A' : '#00C9A7'}
                      strokeWidth="10"
                      strokeDasharray={`${(budgetPct / 100) * 251.2} 251.2`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                      style={{ transition: 'stroke-dasharray 0.8s ease' }}
                    />
                    <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text-primary)">{budgetPct}%</text>
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[rgba(255,255,255,0.65)] font-medium">Spent vs Budget</p>
                  <p className="text-sm font-bold font-['Outfit',sans-serif] text-[var(--text-primary)] truncate">
                    {formatINR(totalSpent)} <span className="text-xs font-normal text-[rgba(255,255,255,0.5)]">/ {formatINR(totalBudget)}</span>
                  </p>
                </div>
              </div>

              {budgets.length === 0 ? (
                <p className="text-[rgba(255,255,255,0.65)] text-xs text-center py-4">No budgets set.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {budgets.slice(0, 3).map(b => (
                    <BudgetBar key={b.category} label={b.category} spent={b.spent || 0} limit={b.limit} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Row 2, Col 3: Spending by Category Donut */}
          <Card className="dash-widget">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-base font-semibold">By Category</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {donutData ? (
                  <Doughnut data={donutData} options={donutOpts} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                    <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', opacity: 0.6 }}><PieChart size={36} /></div>
                    Add expenses to see breakdown
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
