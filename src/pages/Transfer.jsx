import { useState, useEffect } from 'react';
import { auth } from '../firebase/firebaseClient';
import { getUser, addTransaction, addPayee, getPayees, deletePayee } from '../firebase/dbFunctions';
import './Transfer.css';

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

const INITIAL_CONTACTS = [
  { id: 'c1', type: 'contact', name: 'Self Transfer', avatar: 'https://ui-avatars.com/api/?name=Self+Transfer&background=0D8ABC&color=fff' },
];

const Transfer = () => {
  const [contacts, setContacts] = useState(INITIAL_CONTACTS);
  
  
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  // Modals
  const [selectedPayee, setSelectedPayee] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showAddPayeeModal, setShowAddPayeeModal] = useState(false);

  // Send Form
  const [sendAmount, setSendAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  // Add Payee Form
  const [newPayeeName, setNewPayeeName] = useState('');
  const [newPayeeDetail, setNewPayeeDetail] = useState('');
  const [newPayeeType, setNewPayeeType] = useState('contact');

  useEffect(() => {
    const fetchWalletAndPayees = async () => {
      try {
        if (auth.currentUser) {
          const u = await getUser(auth.currentUser.uid);
          if (u) setBalance(u.walletBalance || 0);

          const savedPayees = await getPayees(auth.currentUser.uid);
          
          const customContacts = savedPayees.filter(p => p.type === 'contact');
          
          setContacts([...customContacts, ...INITIAL_CONTACTS]);
          
        }
      } catch (error) {
        console.error("Transfer load error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWalletAndPayees();
  }, []);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleOpenSend = (payee) => {
    setSelectedPayee(payee);
    setShowSendModal(true);
  };

  const handleSendMoney = async (e) => {
    e.preventDefault();
    if (!sendAmount || Number(sendAmount) <= 0) {
      showToast("Enter a valid amount", "error");
      return;
    }
    if (Number(sendAmount) > balance) {
      showToast("Insufficient wallet balance", "error");
      return;
    }

    setProcessing(true);
    try {
      const user = auth.currentUser;
      await addTransaction({
        userId: user.uid,
        type: 'expense',
        amount: Number(sendAmount),
        category: 'Transfer',
        description: `Sent to ${selectedPayee.name}`,
        date: new Date().toISOString().split('T')[0]
      });

      // Update local balance state immediately for UI consistency
      setBalance(prev => prev - Number(sendAmount));
      
      showToast(`Successfully transferred ₹${sendAmount} to ${selectedPayee.name}`);
      setShowSendModal(false);
      setSendAmount('');
    } catch (error) {
      showToast("Failed to transfer money", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleAddPayee = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setProcessing(true);
    try {
      const newPayeeData = {
        name: newPayeeName,
        detail: newPayeeDetail,
        type: newPayeeType,
        isCustom: true,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newPayeeName)}&background=random&color=fff`
      };

      const docId = await addPayee(auth.currentUser.uid, newPayeeData);
      const savedPayee = { id: docId, ...newPayeeData };

      setContacts([savedPayee, ...contacts]);
      showToast(`Added contact ${newPayeeName}`);

      setShowAddPayeeModal(false);
      setNewPayeeName('');
      setNewPayeeDetail('');
    } catch (error) {
      showToast('Failed to save payee', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeletePayee = async (e, payee) => {
    e.stopPropagation();
    if (!auth.currentUser) return;

    if (!window.confirm(`Are you sure you want to delete ${payee.name}?`)) return;

    try {
      if (payee.isCustom) {
        await deletePayee(auth.currentUser.uid, payee.id);
      }
      setContacts(contacts.filter(c => c.id !== payee.id));
      showToast(`Deleted ${payee.name}`);
    } catch (error) {
      showToast('Failed to delete payee', 'error');
    }
  };

  if (loading) return <div className="page"><div className="global-spinner"></div></div>;

  return (
        <div className="page transfer-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="transfer-page-header">
        <div>
          <h2 style={{ marginBottom: '0.25rem', fontSize: '2rem' }}>Transfer Money</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Instantly send funds to your saved contacts.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddPayeeModal(true)} style={{ padding: '0.8rem 1.5rem', fontWeight: 'bold' }}>
          + Add Contact
        </button>
      </div>

      <div className="wallet-balance-card">
        <div style={{ position: 'relative', zIndex: 2 }}>
          <p style={{ opacity: 0.85, fontSize: '0.95rem', margin: 0, fontWeight: 500 }}>Available Wallet Balance</p>
          <h2>₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
        </div>
        <div style={{ fontSize: '4.5rem', opacity: 0.2, position: 'relative', zIndex: 2 }}>
          💸
        </div>
      </div>

      <h3 style={{ marginBottom: '1.25rem' }}>Your Contacts</h3>
      <div className="contacts-grid">
        {contacts.map(c => (
          <div key={c.id} className="contact-card" onClick={() => handleOpenSend(c)}>
            {c.isCustom && (
              <button className="delete-contact-btn" onClick={(e) => handleDeletePayee(e, c)} title="Delete Contact">
                ✕
              </button>
            )}
            <img src={c.avatar} alt={c.name} className="contact-avatar" onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random&color=fff` }} />
            <div className="contact-name">{c.name}</div>
            <div className="contact-detail">{c.detail || 'Saved Contact'}</div>
          </div>
        ))}
      </div>

      {/* Send Modal */}
      {showSendModal && selectedPayee && (
        <div className="modal-overlay">
          <div className="modal card">
            <div className="modal-header">
              <h3>Transfer to {selectedPayee.name}</h3>
              <button className="close-btn" onClick={() => setShowSendModal(false)} disabled={processing}>✕</button>
            </div>
            
            {processing ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                <div className="global-spinner" style={{ margin: '0 auto 1.5rem' }}></div>
                <h4 style={{ color: 'var(--text-primary)' }}>Securely processing transfer...</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Please do not close this window or press back</p>
              </div>
            ) : (
              <form onSubmit={handleSendMoney} className="modal-form">
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                   <img src={selectedPayee.avatar} alt={selectedPayee.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
                   <h4 style={{ marginTop: '0.5rem' }}>{selectedPayee.name}</h4>
                   <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{selectedPayee.detail}</p>
                </div>
                
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={sendAmount} 
                    onChange={(e) => setSendAmount(e.target.value)} 
                    placeholder="Enter amount to send"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary full-width">
                  Confirm Transfer
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add Payee Modal */}
      {showAddPayeeModal && (
        <div className="modal-overlay">
          <div className="modal card">
            <div className="modal-header">
              <h3>Add New Payee</h3>
              <button className="close-btn" onClick={() => setShowAddPayeeModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddPayee} className="modal-form">
              
              <div className="form-group">
                <label>Name</label>
                <input 
                  type="text" 
                  value={newPayeeName} 
                  onChange={(e) => setNewPayeeName(e.target.value)} 
                  placeholder="e.g., Alex Johnson"
                  required
                />
              </div>
              <div className="form-group">
                <label>Detail (Email/Account No)</label>
                <input 
                  type="text" 
                  value={newPayeeDetail} 
                  onChange={(e) => setNewPayeeDetail(e.target.value)} 
                  placeholder="alex@example.com"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary full-width" disabled={processing}>
                {processing ? 'Saving...' : 'Add Contact'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transfer;
