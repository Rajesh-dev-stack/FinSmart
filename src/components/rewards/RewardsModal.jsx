import { useState, useEffect } from 'react';
import { useRewards } from '../../context/RewardsProvider';
import { getCoinTransactions, redeemReward } from '../../firebase/dbFunctions';
import { auth } from '../../firebase/firebaseClient';
import './RewardsModal.css';

const GIFT_CARDS = [
  { id: 'amz1', brand: 'Amazon', value: '50', cost: 500, emoji: '' },
  { id: 'amz2', brand: 'Amazon', value: '120', cost: 1200, emoji: '' },
  { id: 'swig', brand: 'Swiggy', value: '50', cost: 450, emoji: '' },
  { id: 'zom', brand: 'Zomato', value: '50', cost: 450, emoji: '' },
  { id: 'flip', brand: 'Flipkart', value: '50', cost: 500, emoji: '️' },
  { id: 'myn', brand: 'Myntra', value: '75', cost: 600, emoji: '' },
  { id: 'bms', brand: 'BookMyShow', value: '50', cost: 500, emoji: '' },
  { id: 'uber', brand: 'Uber', value: '50', cost: 400, emoji: '' },
];

const RewardsModal = ({ onClose }) => {
  const { totalCoins, coinsEarnedToday } = useRewards();
  const [activeTab, setActiveTab] = useState('redeem'); // 'redeem' | 'history'
  const [transactions, setTransactions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Redemption state
  const [selectedCard, setSelectedCard] = useState(null);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    if (!auth.currentUser) return;
    setLoadingHistory(true);
    const txns = await getCoinTransactions(auth.currentUser.uid);
    setTransactions(txns);
    setLoadingHistory(false);
  };

  const handleRedeem = async () => {
    if (!selectedCard || !auth.currentUser) return;
    
    setRedeemLoading(true);
    try {
      const success = await redeemReward(auth.currentUser.uid, selectedCard.cost, `${selectedCard.brand} ${selectedCard.value}`);
      if (success) {
        setSuccessMsg(`Success! Your ${selectedCard.brand} gift card has been sent to your email successfully. Voucher Code: ${generateVoucherCode()}`);
        setSelectedCard(null); // close confirmation
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setRedeemLoading(false);
    }
  };

  const generateVoucherCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
      if (i === 3 || i === 7) code += '-';
    }
    return code;
  };

  return (
    <div className="rewards-modal-overlay" onClick={onClose}>
      <div className="rewards-modal-content" onClick={e => e.stopPropagation()}>
        <button className="rewards-modal-close" onClick={onClose}>×</button>
        
        <div className="rewards-header">
          <div className="rewards-balance-big">
            <span className="rewards-coin-icon"></span>
            <h2>{totalCoins}</h2>
          </div>
          <p className="rewards-subtitle">Total FinCoins</p>
          {coinsEarnedToday > 0 && (
            <div className="rewards-earned-today">+{coinsEarnedToday} earned today! </div>
          )}
        </div>

        <div className="rewards-tabs">
          <button className={`rewards-tab ${activeTab === 'redeem' ? 'active' : ''}`} onClick={() => setActiveTab('redeem')}>
            Redeem
          </button>
          <button className={`rewards-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            History
          </button>
        </div>

        {activeTab === 'redeem' && (
          <div className="rewards-tab-content redeem-grid">
            {successMsg && (
              <div className="rewards-success-msg">
                 {successMsg}
                <button className="btn btn-outline btn-sm mt-2" onClick={() => setSuccessMsg('')}>Dismiss</button>
              </div>
            )}
            
            {!successMsg && selectedCard ? (
              <div className="rewards-confirm-view">
                <h3>Confirm Redemption</h3>
                <div className="rewards-card big">
                  <span className="rewards-card-emoji">{selectedCard.emoji}</span>
                  <h4>{selectedCard.brand}</h4>
                  <p className="rewards-card-value">{selectedCard.value}</p>
                </div>
                <p>Are you sure you want to spend <strong>{selectedCard.cost} </strong>?</p>
                <div className="rewards-confirm-actions">
                  <button className="btn btn-outline" onClick={() => setSelectedCard(null)} disabled={redeemLoading}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleRedeem} disabled={redeemLoading}>
                    {redeemLoading ? 'Processing...' : 'Yes, Redeem'}
                  </button>
                </div>
              </div>
            ) : !successMsg && (
              GIFT_CARDS.map(card => {
                const canAfford = totalCoins >= card.cost;
                return (
                  <div key={card.id} className={`rewards-card ${!canAfford ? 'locked' : ''}`}>
                    <span className="rewards-card-emoji">{card.emoji}</span>
                    <div className="rewards-card-info">
                      <h4>{card.brand}</h4>
                      <p className="rewards-card-value">{card.value}</p>
                    </div>
                    <button 
                      className="rewards-redeem-btn" 
                      disabled={!canAfford}
                      onClick={() => setSelectedCard(card)}
                    >
                      {card.cost} 
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="rewards-tab-content history-list">
            {loadingHistory ? (
              <p>Loading history...</p>
            ) : transactions.length === 0 ? (
              <p className="empty-text">No FinCoins earned yet. Start logging expenses!</p>
            ) : (
              transactions.map(txn => (
                <div key={txn.id} className="rewards-history-item">
                  <div className="rewards-history-info">
                    <strong>{txn.reason}</strong>
                    <span>{new Date(txn.date).toLocaleDateString()} {new Date(txn.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className={`rewards-history-amount ${txn.type}`}>
                    {txn.type === 'earned' ? '+' : '-'}{txn.amount} 
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardsModal;
