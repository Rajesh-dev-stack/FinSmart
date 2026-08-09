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

const INITIAL_BRANDS = [
  { id: 'b1', type: 'brand', name: 'Netflix', detail: 'Subscription', avatar: 'https://ui-avatars.com/api/?name=Netflix&background=E50914&color=fff' },
  { id: 'b2', type: 'brand', name: 'Amazon', detail: 'Shopping', avatar: 'https://ui-avatars.com/api/?name=Amazon&background=FF9900&color=fff' },
  { id: 'b3', type: 'brand', name: 'Spotify', detail: 'Music', avatar: 'https://ui-avatars.com/api/?name=Spotify&background=1ED760&color=fff' },
];

const Transfer = () => {
  const [contacts, setContacts] = useState(INITIAL_CONTACTS);
  const [brands, setBrands] = useState(INITIAL_BRANDS);
  
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
          const customBrands = savedPayees.filter(p => p.type === 'brand');
          
          setContacts([...customContacts, ...INITIAL_CONTACTS]);
          setBrands([...customBrands, ...INITIAL_BRANDS]);
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

      if (newPayeeType === 'contact') {
        setContacts([savedPayee, ...contacts]);
        showToast(`Added contact ${newPayeeName}`);
      } else {
        setBrands([savedPayee, ...brands]);
        showToast(`Added brand ${newPayeeName}`);
      }

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
      if (payee.type === 'contact') {
        setContacts(contacts.filter(c => c.id !== payee.id));
      } else {
        setBrands(brands.filter(b => b.id !== payee.id));
      }
      showToast(`Deleted ${payee.name}`);
    } catch (error) {
      showToast('Failed to delete payee', 'error');
    }
  };

  if (loading) return <div className="page"><div className="global-spinner"></div></div>;

  return (
    <div className="page transfer-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="page-header" style={{ marginBottom: '1rem', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={() => setShowAddPayeeModal(true)}>
          + Add New Payee
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>
          Available Wallet Balance: <strong style={{ color: 'var(--text-primary)' }}>₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
        </p>
      </div>

      <div className="transfer-grid">
        {/* Contacts */}
        <div className="payee-section">
          <div className="payee-header">
            <h3>Recent Contacts</h3>
          </div>
          <div className="payee-list">
            {contacts.map(c => (
              <div key={c.id} className="payee-card" onClick={() => handleOpenSend(c)}>
                <img src={c.avatar} alt={c.name} className="payee-avatar" />
                <div className="payee-info">
                  <h4>{c.name}</h4>
                  <p>{c.detail}</p>
                </div>
                {c.isCustom && (
                  <button className="payee-delete-btn" onClick={(e) => handleDeletePayee(e, c)} title="Delete Payee">
                    🗑️
                  </button>
                )}
                <div className="payee-action">Send ↗</div>
              </div>
            ))}
          </div>
        </div>

        {/* Brands */}
        <div className="payee-section">
          <div className="payee-header">
            <h3>Brands & Services</h3>
          </div>
          <div className="payee-list">
            {brands.map(b => (
              <div key={b.id} className="payee-card" onClick={() => handleOpenSend(b)}>
                <img src={b.avatar} alt={b.name} className="payee-avatar" onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=random&color=fff` }} />
                <div className="payee-info">
                  <h4>{b.name}</h4>
                  <p>{b.detail}</p>
                </div>
                {b.isCustom && (
                  <button className="payee-delete-btn" onClick={(e) => handleDeletePayee(e, b)} title="Delete Payee">
                    🗑️
                  </button>
                )}
                <div className="payee-action">Pay ↗</div>
              </div>
            ))}
          </div>
        </div>
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
                <label>Type</label>
                <select value={newPayeeType} onChange={(e) => setNewPayeeType(e.target.value)}>
                  <option value="contact">Contact (Person)</option>
                  <option value="brand">Brand (Service)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Name</label>
                <input 
                  type="text" 
                  value={newPayeeName} 
                  onChange={(e) => setNewPayeeName(e.target.value)} 
                  placeholder={newPayeeType === 'contact' ? "e.g., Alex Johnson" : "e.g., Hulu"}
                  required
                />
              </div>
              <div className="form-group">
                <label>Detail (Email/Account No)</label>
                <input 
                  type="text" 
                  value={newPayeeDetail} 
                  onChange={(e) => setNewPayeeDetail(e.target.value)} 
                  placeholder={newPayeeType === 'contact' ? "alex@example.com" : "Subscription ID"}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary full-width" disabled={processing}>
                {processing ? 'Saving...' : `Add ${newPayeeType === 'contact' ? 'Contact' : 'Brand'}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transfer;
