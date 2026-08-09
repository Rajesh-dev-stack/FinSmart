import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseClient';
import { setBudget } from '../firebase/dbFunctions';
import GlassCard from '../components/ui/GlassCard';
import './Budget.css';

const EXPENSE_CATEGORIES = [
  'Food & Canteen', 'Transport & Auto', 'Books & Stationery', 'Entertainment', 
  'Hostel & Rent', 'Medical', 'Mobile Recharge', 'Shopping', 'Travel', 'Transfer', 'Others'
];

const CATEGORY_ICONS = {
  'Food & Canteen': '🍱', 'Transport & Auto': '🛺', 'Books & Stationery': '📚', 'Entertainment': '🎬', 
  'Hostel & Rent': '🏠', 'Medical': '💊', 'Mobile Recharge': '📱', 'Shopping': '🛒', 'Travel': '✈️', 'Transfer': '🔄', 'Others': '🔧'
};

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className={`toast toast-${type}`}>{message}</div>;
};

const Budget = () => {
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // Form State
  const [selectedCategory, setSelectedCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [limitInput, setLimitInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [selectedMonthStr, setSelectedMonthStr] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  // Toasts
  const [toast, setToast] = useState(null);
  const [alertedCategories, setAlertedCategories] = useState(new Set());

  const showToast = (message, type = 'success') => setToast({ message, type });

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    
    let unsubBudgets = () => {};
    let unsubTxns = () => {};
    
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setLoading(true);
        const [year, month] = selectedMonthStr.split('-');
        
        // Listen to Budgets
        const bQuery = query(collection(db, `budgets/${user.uid}/categories`));
        unsubBudgets = onSnapshot(bQuery, (snapshot) => {
          const buds = [];
          snapshot.forEach(doc => buds.push({ category: doc.id, ...doc.data() }));
          setBudgets(buds);
        });

        // Listen to Transactions
        const prefix = `${year}-${String(month).padStart(2, '0')}`;
        const tQuery = query(collection(db, "transactions"), where("userId", "==", user.uid));
        unsubTxns = onSnapshot(tQuery, (snapshot) => {
          const txns = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            let dateStr = data.date;
            if (typeof data.date !== 'string') {
              dateStr = data.date.toDate ? data.date.toDate().toISOString() : String(data.date);
            }
            if (dateStr.startsWith(prefix)) {
              txns.push({ id: doc.id, ...data, date: dateStr });
            }
          });
          setTransactions(txns);
          setLoading(false);
        });

      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubBudgets();
      unsubTxns();
    };
  }, [selectedMonthStr]);

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    if (!limitInput || Number(limitInput) < 0) {
      return showToast("Enter a valid limit", "error");
    }

    const user = auth.currentUser;
    if (!user) return;

    setIsSaving(true);
    try {
      await setBudget(user.uid, selectedCategory, Number(limitInput));
      showToast("Budget limit saved! 🎯", "success");
      setLimitInput('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      showToast("Failed to save budget", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate combined data
  const budgetData = useMemo(() => {
    // Calculate spent per category from transactions ONLY for the selected month
    const spentPerCategory = {};
    transactions.forEach(txn => {
      if (txn.type === 'expense' && txn.category) {
        spentPerCategory[txn.category] = (spentPerCategory[txn.category] || 0) + txn.amount;
      }
    });

    const mapped = budgets.map(b => {
      // OVERRIDE the budget's default .spent value with the computed real monthly spent amount
      const spent = spentPerCategory[b.category] || 0;
      const limit = b.limit || 0;
      const percentage = limit > 0 ? (spent / limit) * 100 : (spent > 0 ? 100 : 0);
      
      let statusMsg = "✅ On track!";
      if (percentage >= 100) statusMsg = "❌ Budget exceeded!";
      else if (percentage >= 80) statusMsg = "🚨 Near limit!";
      else if (percentage >= 50) statusMsg = "⚠️ Moderate spending";

      return { ...b, spent, percentage, statusMsg };
    });

    const isCurrentMonth = selectedMonthStr === new Date().toISOString().slice(0, 7);
    if (isCurrentMonth) {
      mapped.forEach(b => {
        if (b.percentage >= 100 && !alertedCategories.has(`${b.category}-100`)) {
          showToast(`Alert: You have exceeded your budget for ${b.category}!`, "error");
          setAlertedCategories(prev => new Set(prev).add(`${b.category}-100`));
        } else if (b.percentage >= 80 && b.percentage < 100 && !alertedCategories.has(`${b.category}-80`)) {
          showToast(`Warning: You have used ${b.percentage.toFixed(0)}% of your ${b.category} budget.`, "warning");
          setAlertedCategories(prev => new Set(prev).add(`${b.category}-80`));
        }
      });
    }
    
    // Ensure all EXPENSE_CATEGORIES have at least a placeholder card if not in DB
    const finalMapped = [];
    EXPENSE_CATEGORIES.forEach(cat => {
      const existing = mapped.find(b => b.category === cat);
      if (existing) {
        finalMapped.push(existing);
      } else {
        const spent = spentPerCategory[cat] || 0;
        finalMapped.push({
          category: cat, limit: 0, spent, percentage: spent > 0 ? 100 : 0, statusMsg: spent > 0 ? "❌ No limit set!" : "✅ No spending"
        });
      }
    });

    return finalMapped.sort((a, b) => b.percentage - a.percentage);
  }, [budgets, transactions, selectedMonthStr, alertedCategories]); 

  // Fix Overall Usage
  const summary = useMemo(() => {
    const totalBudgeted = budgets.reduce((sum, b) => sum + (b.limit || 0), 0);
    
    // We compute total spent based on actual monthly transactions to be accurate for history
    const totalSpent = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const percentage = totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0;
    return { totalLimit: totalBudgeted, totalSpent, percentage };
  }, [budgets, transactions]);

  const monthOptions = useMemo(() => {
    const opts = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const val = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      opts.push({ value: val, label: val === new Date().toISOString().slice(0, 7) ? `This Month (${label})` : label });
    }
    return opts;
  }, []);

  const handleEditClick = (b) => {
    setSelectedCategory(b.category);
    setLimitInput(b.limit > 0 ? b.limit.toString() : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentSelectedBudget = budgets.find(b => b.category === selectedCategory);
  const currentLimitText = currentSelectedBudget && currentSelectedBudget.limit > 0 
    ? `Current limit: ₹${currentSelectedBudget.limit.toLocaleString()}` 
    : "e.g. 2000";

  if (loading && budgets.length === 0) return <div className="page-content"><div className="global-spinner" style={{margin: '4rem auto'}}></div></div>;
  if (!auth?.currentUser) return <div className="page-content empty-state glass-card"><p>Please log in.</p></div>;

  return (
    <div className="page-content budget-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem' }}>Smart Budgets 📊</h1>
          <p className="text-secondary" style={{ fontSize: '0.95rem' }}>Control your monthly expenses</p>
        </div>
        <select 
          className="month-selector-budget"
          value={selectedMonthStr}
          onChange={(e) => setSelectedMonthStr(e.target.value)}
          style={{ padding: '0.5rem 1rem', borderRadius: 'var(--r-md)', background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
        >
          {monthOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Monthly Budget Summary */}
      <GlassCard className="budget-summary-card-fullwidth" style={{ padding: '2rem', marginBottom: '2rem', borderTop: '2px solid var(--accent-primary)' }}>
        <div className="fullwidth-summary-content" style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="summary-stats-fullwidth" style={{ flex: '1', minWidth: '200px' }}>
            <div className="stat" style={{ marginBottom: '1rem' }}>
              <span className="text-secondary">Total Budgeted</span>
              <h4 style={{ fontSize: '2rem', color: 'var(--accent-primary)' }}>₹{summary.totalLimit.toLocaleString()}</h4>
            </div>
            <div className="stat">
              <span className="text-secondary">Total Spent</span>
              <h4 style={{ fontSize: '2rem', color: summary.percentage >= 100 ? 'var(--danger)' : 'var(--text-primary)' }}>₹{summary.totalSpent.toLocaleString()}</h4>
            </div>
          </div>
          
          <div className="overall-progress-fullwidth" style={{ flex: '2', minWidth: '300px' }}>
            <div className="progress-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="text-secondary">Overall Usage</span>
              <span style={{ fontWeight: 'bold' }}>{summary.percentage.toFixed(0)}%</span>
            </div>
            <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(summary.percentage, 100)}%`,
                height: '100%',
                background: summary.percentage >= 100 ? 'var(--danger)' : (summary.percentage >= 80 ? 'var(--warning)' : 'var(--accent-primary)'),
                borderRadius: '5px',
                transition: 'width 0.5s ease'
              }}/>
            </div>
            <p className="text-secondary" style={{ marginTop: '0.75rem', textAlign: 'right', fontSize: '0.9rem' }}>
              ₹{Math.max(summary.totalLimit - summary.totalSpent, 0).toLocaleString()} remaining total
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="budget-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2rem', alignItems: 'start' }}>
        <div className="budget-sidebar">
          {/* Set Budget Form */}
          <GlassCard className="set-budget-card" style={{ padding: '1.5rem', position: 'sticky', top: '100px' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Set Budget Limit</h3>
            <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>Manage your monthly spending limits.</p>
            <form onSubmit={handleSaveBudget} className="budget-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="text-secondary" style={{ fontSize: '0.85rem' }}>Category</label>
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="text-secondary" style={{ fontSize: '0.85rem' }}>Monthly Limit (₹)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={limitInput} 
                  onChange={(e) => setLimitInput(e.target.value)} 
                  placeholder={currentLimitText}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                />
              </div>
              <button type="submit" className="btn" style={{ background: 'var(--gradient-primary)', color: '#fff', padding: '0.75rem', marginTop: '0.5rem', width: '100%' }} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Budget'}
              </button>
            </form>
          </GlassCard>
        </div>

        <div className="budget-main">
          <div className="budget-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {budgetData.map(b => (
              <GlassCard key={b.category} className="budget-card" style={{ padding: '1.5rem', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                    <span>{CATEGORY_ICONS[b.category]}</span>
                    {b.category}
                  </h4>
                  <button 
                    onClick={() => handleEditClick(b)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                    title="Edit limit"
                  >
                    ✏️
                  </button>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                    ₹{b.spent.toLocaleString()} <span className="text-muted" style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>of ₹{b.limit.toLocaleString()}</span>
                  </p>
                </div>

                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <div style={{
                    width: `${Math.min(b.percentage, 100)}%`,
                    height: '100%',
                    background: b.percentage >= 100 ? '#FF5252' : (b.percentage >= 80 ? '#FFD740' : '#00D4FF'),
                    borderRadius: '3px',
                    transition: 'width 0.5s ease'
                  }}/>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: b.percentage >= 100 ? '#FF5252' : (b.percentage >= 80 ? '#FFD740' : 'var(--text-secondary)') }}>
                    {b.statusMsg}
                  </span>
                  <span className="text-secondary">
                    {b.percentage.toFixed(0)}% used
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Budget;
