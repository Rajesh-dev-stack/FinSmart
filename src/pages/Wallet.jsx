import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebaseClient';
import { 
  getUser, 
  getTransactions, 
  addTransaction, 
  getUserByEmail 
} from '../firebase/dbFunctions';
import TransactionCard from '../components/dashboard/TransactionCard';
import './Wallet.css';

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      {message}
    </div>
  );
};

const Wallet = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState(null);

  // Filters
  const [filterMonth, setFilterMonth] = useState('all');

  // Form states
  const [addAmount, setAddAmount] = useState('');
  const [addMethod, setAddMethod] = useState('UPI');
  
  const [sendEmail, setSendEmail] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendDesc, setSendDesc] = useState('');

  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchWalletData(user.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchWalletData = async (userId, quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const userDoc = await getUser(userId);
      if (userDoc) setBalance(userDoc.walletBalance || 0);

      const txns = await getTransactions(userId);
      setTransactions(txns);
    } catch (error) {
      console.error("fetchWalletData error:", error);
      showToast(`Error: ${error.message}`, "error");
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleAddMoney = async (e) => {
    e.preventDefault();
    if (!addAmount || Number(addAmount) <= 0) {
      showToast("Enter a valid amount", "error");
      return;
    }

    setProcessing(true);
    try {
      const user = auth.currentUser;
      await addTransaction({
        userId: user.uid,
        type: 'income',
        amount: Number(addAmount),
        category: 'Wallet Deposit',
        description: `Added via ${addMethod}`,
        date: new Date().toISOString().split('T')[0]
      });

      showToast(`Successfully add ₹${addAmount} in your wallet`);
      setShowAddModal(false);
      setAddAmount('');
      fetchWalletData(user.uid, true);
    } catch (error) {
      console.error("Add money error:", error);
      showToast(`Error: ${error.message}`, "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleSendMoney = async (e) => {
    e.preventDefault();
    if (!sendEmail || !sendAmount || Number(sendAmount) <= 0) {
      showToast("Please fill all fields correctly", "error");
      return;
    }
    
    if (Number(sendAmount) > balance) {
      showToast("Insufficient balance", "error");
      return;
    }

    const currentUser = auth.currentUser;
    if (sendEmail === currentUser.email) {
      showToast("You cannot send money to yourself", "error");
      return;
    }

    setProcessing(true);
    try {
      // 1. Find recipient by email
      const recipient = await getUserByEmail(sendEmail);
      if (!recipient) {
        showToast("User not found", "error");
        setProcessing(false);
        return;
      }

      const currentDate = new Date().toISOString().split('T')[0];

      // 2. Deduct from sender
      await addTransaction({
        userId: currentUser.uid,
        type: 'expense',
        amount: Number(sendAmount),
        category: 'Transfer',
        description: `Sent to ${recipient.name} (${sendDesc})`,
        date: currentDate
      });

      // 3. Add to recipient
      await addTransaction({
        userId: recipient.id,
        type: 'income',
        amount: Number(sendAmount),
        category: 'Transfer',
        description: `Received from ${currentUser.displayName || 'a user'} (${sendDesc})`,
        date: currentDate
      });

      showToast(`Successfully sent ₹${sendAmount} to ${recipient.name}`);
      setShowSendModal(false);
      setSendEmail('');
      setSendAmount('');
      setSendDesc('');
      fetchWalletData(currentUser.uid, true);
    } catch (error) {
      showToast("Failed to send money", "error");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="page"><div className="global-spinner"></div></div>;
  }

  if (!auth?.currentUser) {
    return <div className="page empty-state card"><p>Please log in to view your wallet.</p></div>;
  }

  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const filteredTransactions = filterMonth === 'this-month' 
    ? transactions.filter(t => t.date.startsWith(currentMonthPrefix))
    : transactions;

  return (
    <div className="page wallet-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Title removed to avoid duplication with Navbar */}

      {/* 1. Wallet Balance Card */}
      <div className="wallet-balance-card card">
        <div className="wallet-card-bg"></div>
        <div className="wallet-content">
          <p className="wallet-label">Available Balance</p>
          <h1 className="wallet-amount">₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h1>
          
          <div className="wallet-actions">
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              + Add Money
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/transfer')}>
              ↗ Transfer Money
            </button>
          </div>
        </div>
      </div>

      <div className="wallet-grid">
        {/* 4. Recent Wallet Transactions */}
        <div className="card wallet-transactions">
          <div className="flex-between">
            <h3>Recent Transactions</h3>
            <select className="filter-select" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              <option value="all">All Time</option>
              <option value="this-month">This Month</option>
            </select>
          </div>

          <div className="transaction-list">
            {filteredTransactions.length === 0 ? (
              <p className="empty-text">No transactions found.</p>
            ) : (
              filteredTransactions.map(txn => (
                <TransactionCard key={txn.id} transaction={txn} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* 2. Add Money Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal card">
            <div className="modal-header">
              <h3>Add Money to Wallet</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)} disabled={processing}>✕</button>
            </div>
            {processing ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                <div className="global-spinner" style={{ margin: '0 auto 1.5rem' }}></div>
                <h4 style={{ color: 'var(--text-primary)' }}>Securely processing...</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Please do not close this window or press back</p>
              </div>
            ) : (
              <form onSubmit={handleAddMoney} className="modal-form">
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={addAmount} 
                    onChange={(e) => setAddAmount(e.target.value)} 
                    placeholder="Enter amount"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select value={addMethod} onChange={(e) => setAddMethod(e.target.value)}>
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Net Banking">Net Banking</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary full-width">
                  Confirm Payment
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 3. Send Money Modal */}
      {showSendModal && (
        <div className="modal-overlay">
          <div className="modal card">
            <div className="modal-header">
              <h3>Send Money</h3>
              <button className="close-btn" onClick={() => setShowSendModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSendMoney} className="modal-form">
              <div className="form-group">
                <label>Recipient Email</label>
                <input 
                  type="email" 
                  value={sendEmail} 
                  onChange={(e) => setSendEmail(e.target.value)} 
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Amount (₹)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={sendAmount} 
                  onChange={(e) => setSendAmount(e.target.value)} 
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <input 
                  type="text" 
                  value={sendDesc} 
                  onChange={(e) => setSendDesc(e.target.value)} 
                  placeholder="What's this for?"
                />
              </div>
              <button type="submit" className="btn btn-primary full-width" disabled={processing}>
                {processing ? 'Sending...' : 'Send Securely'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Wallet;
