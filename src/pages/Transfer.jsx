import { useState, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import SendMoneyModal from '../components/SendMoneyModal';
import { auth } from '../firebase/firebaseClient';
import { getUser, addTransaction, addPayee, getPayees, deletePayee, findUserByFinSmartId } from '../firebase/dbFunctions';
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

const Transfer = () => {
  const [contacts, setContacts] = useState([]);
  
  
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
  const [searchingPayee, setSearchingPayee] = useState(false);
  const [payeeSearchError, setPayeeSearchError] = useState(null);
  const [foundPayeeUser, setFoundPayeeUser] = useState(null);

  useEffect(() => {
    const fetchWalletAndPayees = async () => {
      try {
        if (auth.currentUser) {
          const u = await getUser(auth.currentUser.uid);
          if (u) setBalance(u.walletBalance || 0);

          const savedPayees = await getPayees(auth.currentUser.uid);
          
          const customContacts = savedPayees.filter(p => p.type === 'contact');
          
          setContacts(customContacts);
          
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

  const handleSearchPayee = async (e) => {
    if (e) e.preventDefault();
    const idToSearch = newPayeeDetail.trim().toUpperCase();
    if (!idToSearch) {
      setPayeeSearchError('Please enter a FinSmart ID to search');
      return;
    }
    setSearchingPayee(true);
    setPayeeSearchError(null);
    try {
      const userData = await findUserByFinSmartId(idToSearch);
      setFoundPayeeUser(userData);
      if (!newPayeeName || newPayeeName.trim() === '') {
        setNewPayeeName(userData.name || 'User');
      }
    } catch (err) {
      setFoundPayeeUser(null);
      setPayeeSearchError(err.message || 'FinSmart ID not found!');
    } finally {
      setSearchingPayee(false);
    }
  };

  const handleCloseAddPayeeModal = () => {
    setShowAddPayeeModal(false);
    setNewPayeeName('');
    setNewPayeeDetail('');
    setFoundPayeeUser(null);
    setPayeeSearchError(null);
    setSearchingPayee(false);
  };

  const handleAddPayee = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (!foundPayeeUser) {
      await handleSearchPayee();
      return;
    }
    
    setProcessing(true);
    try {
      const displayName = (newPayeeName.trim() || foundPayeeUser.name || 'User');
      const newPayeeData = {
        name: displayName,
        detail: newPayeeDetail.trim().toUpperCase(),
        type: newPayeeType,
        isCustom: true,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff`
      };

      const docId = await addPayee(auth.currentUser.uid, newPayeeData);
      const savedPayee = { id: docId, ...newPayeeData };

      setContacts([savedPayee, ...contacts]);
      showToast(`Added contact ${displayName}`);

      handleCloseAddPayeeModal();
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
          <h2>{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
        </div>
        <div style={{ fontSize: '4.5rem', opacity: 0.2, position: 'relative', zIndex: 2 }}>
          
        </div>
      </div>

      <h3 style={{ marginBottom: '1.25rem' }}>Your Contacts</h3>
      {contacts.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>No saved contacts yet. Click "+ Add Contact" to add one.</p>
      ) : (
        <div className="contacts-grid">
          {contacts.map(c => (
            <div key={c.id} className="contact-card" onClick={() => handleOpenSend(c)}>
              {c.isCustom && (
                <button className="delete-contact-btn" onClick={(e) => handleDeletePayee(e, c)} title="Delete Contact">
                  <X size={14} />
                </button>
              )}
              <img src={c.avatar} alt={c.name} className="contact-avatar" onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random&color=fff` }} />
              <div className="contact-name">{c.name}</div>
              <div className="contact-detail">{c.detail || 'Saved Contact'}</div>
            </div>
          ))}
        </div>
      )}

            {/* Send Modal */}
      {showSendModal && (
        <SendMoneyModal 
          senderUid={auth.currentUser.uid}
          senderBalance={balance}
          initialFinSmartId={selectedPayee?.detail}
          onClose={() => {
            setShowSendModal(false);
            setSelectedPayee(null);
          }}
          onSuccess={(amt) => {
            setShowSendModal(false);
            setSelectedPayee(null);
            showToast(`Successfully sent ${amt}!`);
            // balance updates automatically in Wallet, but in Transfer we manually fetch on mount.
            // Let's just update local balance manually.
            setBalance(prev => prev - Number(amt));
          }}
        />
      )}
      
{/* Add Payee Modal */}
      {showAddPayeeModal && (
        <div className="modal-overlay">
          <div className="modal card" style={{ maxWidth: '420px', width: '100%' }}>
            <div className="modal-header">
              <h3>Add New Payee</h3>
              <button className="close-btn" onClick={handleCloseAddPayeeModal}><X size={18} /></button>
            </div>
            <form onSubmit={foundPayeeUser ? handleAddPayee : handleSearchPayee} className="modal-form">
              <div className="form-group">
                <label>Receiver's FinSmart ID</label>
                <input 
                  type="text" 
                  value={newPayeeDetail} 
                  onChange={(e) => {
                    setNewPayeeDetail(e.target.value.toUpperCase());
                    setFoundPayeeUser(null);
                    setPayeeSearchError(null);
                  }} 
                  placeholder="FIN2026..."
                  maxLength={13}
                  style={{ textTransform: 'uppercase' }}
                  required
                />
              </div>

              {payeeSearchError && (
                <div style={{ color: 'var(--danger)', marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                  {payeeSearchError}
                </div>
              )}

              {foundPayeeUser && (
                <>
                  <div style={{ background: 'rgba(0, 201, 167, 0.1)', border: '1px solid rgba(0, 201, 167, 0.3)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#00C9A7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={14} /> Verified Account
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{newPayeeDetail}</span>
                    </div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{foundPayeeUser.name}</p>
                  </div>

                  <div className="form-group">
                    <label>Contact Name</label>
                    <input 
                      type="text" 
                      value={newPayeeName} 
                      onChange={(e) => setNewPayeeName(e.target.value)} 
                      placeholder="e.g., Alex Johnson"
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary full-width" disabled={processing}>
                    {processing ? 'Saving...' : 'Add Contact'}
                  </button>
                </>
              )}

              {!foundPayeeUser && (
                <button 
                  type="submit" 
                  className="btn btn-primary full-width" 
                  disabled={searchingPayee || !newPayeeDetail.trim()}
                  style={{ marginTop: '0.5rem' }}
                >
                  {searchingPayee ? 'Searching...' : 'Search Contact'}
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transfer;
