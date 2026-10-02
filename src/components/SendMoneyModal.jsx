import { useState, useEffect } from 'react';
import { initiateTransfer } from '../utils/tokenTransfer';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase/firebaseClient';
import { awardCoins } from '../firebase/dbFunctions';

const SendMoneyModal = ({ sender, receiver, amount, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1 = confirm, 2 = token/wait, 3 = success
  const [token, setToken] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Step 2: Confirm & Send -> generates token
  const handleConfirm = async () => {
    setProcessing(true);
    setError(null);
    try {
      const generatedToken = await initiateTransfer(
        sender,
        receiver,
        Number(amount),
        ''
      );
      setToken(generatedToken);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to initiate secure transfer.');
    } finally {
      setProcessing(false);
    }
  };

  // Listen to token changes to detect redemption
  useEffect(() => {
    if (step === 2 && token) {
      const unsub = onSnapshot(doc(db, 'transferTokens', token), async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.status === 'redeemed') {
            // Reward sender!
            try { await awardCoins(sender.uid, 5, 'Secure transfer completed'); } catch(e){}
            setStep(3); // success!
          }
        } else {
          // If token was deleted without being redeemed, or it expired
          // Wait, if it expires, it gets deleted.
          if (step === 2) {
             setError('Token expired or transfer was cancelled.');
             setStep(1); // fallback
          }
        }
      });
      return () => unsub();
    }
  }, [step, token, sender.uid]);

  // Timer for step 2
  useEffect(() => {
    let timer;
    if (step === 2) {
      setTimeLeft(60);
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setError('Transfer timed out.');
            setStep(1);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step]);

  return (
    <div className="modal-overlay">
      <div className="modal card" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <div className="modal-header">
          <h3>
            {step === 1 && '🔐 Secure Transfer'}
            {step === 2 && '⏳ Processing Transfer...'}
            {step === 3 && '✅ Transfer Complete!'}
          </h3>
          {step !== 2 && (
            <button className="close-btn" onClick={step === 3 ? onSuccess : onClose}>✕</button>
          )}
        </div>

        <div style={{ padding: '1.5rem' }}>
          {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>{error}</div>}

          {step === 1 && (
            <>
              <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                Sending: <strong>₹{amount}</strong>
              </p>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                To: {receiver.name} ({receiver.finsmartId})
              </p>
              <div style={{ background: 'var(--bg)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                🛡️ One-time secure token will be generated.<br/><br/>
                <span style={{ color: 'var(--warning)' }}>Token expires in: 60 seconds</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn profile-btn-outline" style={{ flex: 1 }} onClick={onClose} disabled={processing}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleConfirm} disabled={processing}>
                  {processing ? 'Processing...' : 'Confirm & Send 🔐'}
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>🔐 Token Generated!</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Waiting for auto redemption on receiver's device...</p>
              
              <div style={{ background: 'var(--bg)', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div style={{ background: 'var(--primary)', height: '100%', width: `${(timeLeft / 60) * 100}%`, transition: 'width 1s linear' }}></div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{timeLeft} seconds remaining</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '1.5rem' }}>Token auto redeems on receiver's device instantly!</p>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>₹{amount} sent to {receiver.name}!</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>🔐 Token redeemed & destroyed</p>
              <p style={{ color: 'var(--warning)', fontWeight: 'bold', marginBottom: '2rem' }}>+5 FinCoins earned! 🪙</p>
              
              <button className="btn btn-primary full-width" onClick={onSuccess}>Done</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SendMoneyModal;
