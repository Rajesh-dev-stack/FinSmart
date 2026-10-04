import { useState } from 'react';
import { X } from 'lucide-react';
import { findUserByFinSmartId, sendMoneyByFinSmartId } from '../firebase/dbFunctions';

const SendMoneyModal = ({ senderUid, senderBalance, initialFinSmartId, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [finSmartId, setFinSmartId] = useState(initialFinSmartId || '');
  const [receiver, setReceiver] = useState(null);
  const [amount, setAmount] = useState('');
    const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!finSmartId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await findUserByFinSmartId(finSmartId);
      if (data.userId === senderUid) {
        throw new Error(' Cannot send money to yourself!');
      }
      setReceiver(data);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      setError(' Cannot send 0 or negative amount');
      return;
    }
    if (amountNum > senderBalance) {
      setError(' Insufficient balance!');
      return;
    }
    setError(null);
    setStep(3);
  };

  const confirmTransfer = async () => {
    const amountNum = Number(amount);
    setLoading(true);
    setError(null);
    try {
      await sendMoneyByFinSmartId(senderUid, receiver.userId === finSmartId ? receiver.finsmartId : finSmartId, amountNum, '');
      
      setSuccessData({
        amount: amountNum,
        name: receiver.name,
        newBalance: senderBalance - amountNum
      });
      setStep(4);
      if (onSuccess) onSuccess(amountNum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal card" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="modal-header">
          <h3>
            {step === 1 && ' Send Money'}
            {step === 2 && ' Send Money'}
            {step === 3 && ' Confirm Transfer'}
            {step === 4 && ' Transfer Successful!'}
          </h3>
          {step !== 4 && (
            <button className="close-btn" onClick={onClose} disabled={loading}><X size={18} /></button>
          )}
        </div>

        <div style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{ color: 'var(--danger)', marginBottom: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSearch}>
              <div className="form-group">
                <label>Enter FinSmart ID:</label>
                <input
                  type="text"
                  placeholder="FIN2026..."
                  value={finSmartId}
                  onChange={(e) => setFinSmartId(e.target.value.toUpperCase())}
                  maxLength={13}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn profile-btn-outline" style={{ flex: 1 }} onClick={onClose} disabled={loading}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Searching...' : 'Search '}
                </button>
              </div>
            </form>
          )}

          {step === 2 && receiver && (
            <form onSubmit={handleSend}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}> {receiver.name}</h4>
                <p style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{finSmartId}</p>
              </div>

              <div className="form-group">
                <label>Amount ()</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>


              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn profile-btn-outline" style={{ flex: 1 }} onClick={() => setStep(1)} disabled={loading}>Back</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading || !amount || Number(amount) <= 0}>
                  {loading ? 'Sending...' : 'Send Money '}
                </button>
              </div>
            </form>
          )}

          {step === 3 && receiver && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem', background: 'rgba(0, 201, 167, 0.1)', border: '1px solid rgba(0, 201, 167, 0.3)', padding: '1.5rem', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>You are about to send</p>
                <h2 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>{Number(amount).toLocaleString()}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>to</p>
                <h4 style={{ fontSize: '1.2rem', margin: 0 }}>{receiver.name}</h4>
                <p style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.85rem' }}>{finSmartId}</p>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn profile-btn-outline" style={{ flex: 1 }} onClick={() => setStep(2)} disabled={loading}>Cancel</button>
                <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={confirmTransfer} disabled={loading}>
                  {loading ? 'Processing...' : 'Confirm Transfer'}
                </button>
              </div>
            </div>
          )}

          {step === 4 && successData && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}></div>
              <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                {successData.amount.toLocaleString()} sent to {successData.name}
              </p>
              <p style={{ color: 'var(--warning)', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                +5 FinCoins earned! 
              </p>

              <div style={{ background: 'var(--bg)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>New Balance</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{successData.newBalance.toLocaleString()}</p>
              </div>

              <button className="btn btn-primary full-width" onClick={onClose}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SendMoneyModal;
