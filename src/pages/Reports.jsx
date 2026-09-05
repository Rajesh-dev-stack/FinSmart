import { useState, useEffect, useMemo } from 'react';
import { auth } from '../firebase/firebaseClient';
import { getUser, getTransactionsByMonth, getBudgets } from '../firebase/dbFunctions';
import { analyzeSpending } from '../ai/nvidiaHelper';
import './Reports.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className={`toast toast-${type}`}>{message}</div>;
};

const Reports = () => {
  const [loading, setLoading] = useState(false);

  // Selectors
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Data
  const [userData, setUserData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [aiSummary, setAiSummary] = useState(null);

  // UI
  const [previewReady, setPreviewReady] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  const fetchReportData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    setPreviewReady(false);
    setAiSummary(null);

    try {
      const [uDoc, txns, bdgts] = await Promise.all([
        getUser(user.uid),
        getTransactionsByMonth(user.uid, selectedMonth, selectedYear),
        getBudgets(user.uid),
      ]);

      setUserData(uDoc);
      setTransactions(txns);
      setBudgets(bdgts);
      setPreviewReady(true);

      if (txns.length === 0) showToast('No transactions found for this month.', 'warning');
    } catch (err) {
      console.error(err);
      showToast(`Failed to load report data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Summary calculations for preview
  const summary = useMemo(() => {
    let income = 0, expense = 0;
    transactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, savings: income - expense };
  }, [transactions]);

  const handleIncludeAi = async () => {
    if (transactions.length === 0) return showToast('No transactions to analyze.', 'error');
    setLoadingAi(true);
    try {
      const result = await analyzeSpending(transactions.slice(0, 40));
      setAiSummary(result);
      showToast('AI insights generated!');
    } catch {
      showToast('AI analysis failed.', 'error');
    } finally {
      setLoadingAi(false);
    }
  };

  // Year options (current year and 2 years back)
  const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  if (!auth?.currentUser) return <div className="page empty-state card"><p>Please log in.</p></div>;

  return (
    <div className="page reports-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <p className="page-subtitle">Generates monthly financial reports:</p>

      {/* Selector Section */}
      <div className="card report-selector-card">
        <h3>Select Period</h3>
        <div className="selector-row">
          <div className="form-group">
            <label>Month</label>
            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Year</label>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button className="btn btn-primary generate-btn" onClick={fetchReportData} disabled={loading}>
            {loading ? 'Loading...' : '📊 Generate Preview'}
          </button>
        </div>
      </div>

      {/* Preview Section */}
      {previewReady && (
        <div className="report-preview-area">

          {/* Summary Preview */}
          <div className="card preview-summary-card">
            <div className="preview-title-row">
              <h3>Report Preview — {MONTH_NAMES[selectedMonth - 1]} {selectedYear}</h3>
            </div>

            <div className="preview-stats">
              <div className="preview-stat">
                <span>Income</span>
                <h4 className="text-green">₹{summary.income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
              </div>
              <div className="preview-stat">
                <span>Expenses</span>
                <h4 className="text-red">₹{summary.expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h4>
              </div>
              <div className="preview-stat">
                <span>Savings</span>
                <h4 className={summary.savings >= 0 ? 'text-green' : 'text-red'}>
                  ₹{summary.savings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h4>
              </div>
              <div className="preview-stat">
                <span>Transactions</span>
                <h4>{transactions.length}</h4>
              </div>
            </div>
          </div>

          {/* Transaction Preview Table */}
          <div className="card">
            <h3>Transactions ({transactions.length})</h3>
            {transactions.length === 0 ? (
              <p className="empty-text">No transactions for this period.</p>
            ) : (
              <div className="preview-table-wrap">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 10).map((t, i) => (
                      <tr key={i}>
                        <td>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                        <td>{t.category}</td>
                        <td className="desc-cell">{t.description || '—'}</td>
                        <td className={`text-right font-bold ${t.type === 'income' ? 'text-green' : 'text-red'}`}>
                          {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.length > 10 && (
                  <p className="more-text">...and {transactions.length - 10} more in the full PDF.</p>
                )}
              </div>
            )}
          </div>

          {/* Budget Preview */}
          {budgets.length > 0 && (
            <div className="card">
              <h3>Budget Overview ({budgets.length} categories)</h3>
              <div className="preview-table-wrap">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th className="text-right">Limit</th>
                      <th className="text-right">Spent</th>
                      <th className="text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgets.map((b, i) => {
                      const spent = b.spent || 0;
                      return (
                        <tr key={i}>
                          <td>{b.category}</td>
                          <td className="text-right">₹{b.limit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="text-right">₹{spent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className={`text-right font-bold ${b.limit - spent >= 0 ? 'text-green' : 'text-red'}`}>
                            ₹{Math.max(b.limit - spent, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI & Download Actions */}
          <div className="card download-actions-card">
            <div className="action-row">
              <button
                className="btn btn-outline"
                onClick={handleIncludeAi}
                disabled={loadingAi}
              >
                {loadingAi ? '🤖 Generating...' : aiSummary ? '✅ AI Insights Included' : '🧠 Include AI Insights'}
              </button>
            </div>
            {aiSummary && (
              <div className="ai-preview">
                <p className="ai-preview-label">AI Insights Preview:</p>
                <p className="ai-preview-text">{aiSummary}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
