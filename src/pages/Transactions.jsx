import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { auth } from '../firebase/firebaseClient';
import { getTransactions, addTransaction, deleteTransaction, updateTransaction } from '../firebase/dbFunctions';
import './Transactions.css';

const EXPENSE_CATEGORIES = [
  'Food/Canteen', 'Transport/Auto', 'Books & Stationery', 'Entertainment', 
  'Hostel/Rent', 'Medical', 'Mobile Recharge', 'Shopping', 'Travel', 'Transfer', 'Others'
];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Gift', 'Other'];

const CATEGORY_ICONS = {
  'Food/Canteen': '🍱', 'Transport/Auto': '🛺', 'Books & Stationery': '📚', 'Entertainment': '🎬', 
  'Hostel/Rent': '🏠', 'Medical': '💊', 'Mobile Recharge': '📱', 'Shopping': '🛒', 'Travel': '✈️', 'Transfer': '🔄', 'Others': '🔧',
  'Salary': '💼', 'Freelance': '💻', 'Business': '🏢', 'Gift': '🎁', 'Other': '📦'
};

const Transactions = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  
  // Form State
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [processing, setProcessing] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');

  const location = useLocation();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchData(user.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (location.state?.openAdd) {
      openAddModal();
      // Clear the state so it doesn't keep opening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchData = async (userId) => {
    setLoading(true);
    try {
      const txns = await getTransactions(userId);
      setTransactions(txns);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingTxn(null);
    setType('expense');
    setCategory(EXPENSE_CATEGORIES[0]);
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  const openEditModal = (txn) => {
    setEditingTxn(txn);
    setType(txn.type);
    setCategory(txn.category);
    setAmount(txn.amount.toString());
    setDescription(txn.description || '');
    setDate(txn.date);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return alert('Invalid amount');

    const user = auth.currentUser;
    setProcessing(true);

    const txnData = {
      userId: user.uid,
      type,
      amount: Number(amount),
      category,
      description,
      date
    };

    try {
      if (editingTxn) {
        await updateTransaction(editingTxn.id, editingTxn, txnData);
      } else {
        await addTransaction(txnData);
      }
      setShowModal(false);
      fetchData(user.uid);
    } catch (error) {
      alert('Error saving transaction');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (txn) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      await deleteTransaction(txn.id, txn.userId, txn.amount, txn.type, txn.category);
      fetchData(auth.currentUser.uid);
    } catch (error) {
      alert('Error deleting transaction');
    }
  };

  // Filter Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(txn => {
      const matchSearch = txn.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          txn.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'all' || txn.type === filterType;
      const matchCat = filterCategory === 'all' || txn.category === filterCategory;
      const matchMonth = filterMonth === 'all' || txn.date.startsWith(filterMonth);
      
      return matchSearch && matchType && matchCat && matchMonth;
    });
  }, [transactions, searchTerm, filterType, filterCategory, filterMonth]);

  // Summary logic
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  const currentMonthPrefix = new Date().toISOString().slice(0, 7);

  if (loading) return <div className="page"><div className="global-spinner"></div></div>;
  if (!auth?.currentUser) return <div className="page empty-state card"><p>Please log in.</p></div>;

  return (
    <div className="page transactions-page">
      <div className="flex-between" style={{ justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="btn btn-primary" onClick={openAddModal}>+ Add Transaction</button>
      </div>

      {/* Summary Bar */}
      <div className="summary-bar card">
        <div className="summary-item">
          <span>Total Income</span>
          <h3 className="text-green">+₹{summary.income.toFixed(2)}</h3>
        </div>
        <div className="summary-item">
          <span>Total Expense</span>
          <h3 className="text-red">-₹{summary.expense.toFixed(2)}</h3>
        </div>
        <div className="summary-item">
          <span>Net Balance</span>
          <h3 className={summary.net >= 0 ? 'text-green' : 'text-red'}>
            {summary.net >= 0 ? '+' : '-'}₹{Math.abs(summary.net).toFixed(2)}
          </h3>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section card">
        <input 
          type="text" 
          placeholder="Search descriptions..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)}
          className="filter-input"
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="filter-select">
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="filter-select">
          <option value="all">All Categories</option>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          {INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="filter-select">
          <option value="all">All Time</option>
          <option value={currentMonthPrefix}>This Month</option>
        </select>
      </div>

      {/* Transaction List */}
      <div className="card tx-list-container">
        {filteredTransactions.length === 0 ? (
          <p className="empty-text">No transactions found matching your filters.</p>
        ) : (
          <table className="tx-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th className="text-right">Amount</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(txn => (
                <tr key={txn.id}>
                  <td>{new Date(txn.date).toLocaleDateString()}</td>
                  <td>
                    <span className="tx-icon">{CATEGORY_ICONS[txn.category] || '📦'}</span> 
                    {txn.category}
                  </td>
                  <td className="tx-desc">{txn.description}</td>
                  <td className={`text-right font-bold ${txn.type === 'income' ? 'text-green' : 'text-red'}`}>
                    {txn.type === 'income' ? '+' : '-'}₹{txn.amount.toFixed(2)}
                  </td>
                  <td className="text-center">
                    <button className="icon-btn edit-btn" onClick={() => openEditModal(txn)}>✏️</button>
                    <button className="icon-btn delete-btn" onClick={() => handleDelete(txn)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal card">
            <div className="modal-header">
              <h3>{editingTxn ? 'Edit Transaction' : 'Add Transaction'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group type-toggle">
                <button type="button" className={`toggle-btn ${type === 'expense' ? 'active-expense' : ''}`} onClick={() => { setType('expense'); setCategory(EXPENSE_CATEGORIES[0]); }}>Expense</button>
                <button type="button" className={`toggle-btn ${type === 'income' ? 'active-income' : ''}`} onClick={() => { setType('income'); setCategory(INCOME_CATEGORIES[0]); }}>Income</button>
              </div>
              
              <div className="form-group">
                <label>Amount (₹)</label>
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this for?" />
              </div>

              <button type="submit" className="btn btn-primary full-width" disabled={processing}>
                {processing ? 'Saving...' : 'Save Transaction'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
