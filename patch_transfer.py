import re

with open('src/pages/Transfer.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

import_str = "import SendMoneyModal from '../components/SendMoneyModal';\nimport { getUserByFinSmartId, getUser } from '../firebase/dbFunctions';\n"
code = code.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect } from 'react';\n" + import_str)

old_handle_send = """  const handleSendMoney = async (e) => {
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
  };"""

new_handle_send = """  const [receiverUser, setReceiverUser] = useState(null);
  const [currentUserDoc, setCurrentUserDoc] = useState(null);

  useEffect(() => {
    if (auth.currentUser) {
      getUser(auth.currentUser.uid).then(setCurrentUserDoc);
    }
  }, []);

  const handleInitiateSend = async (e) => {
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
      const receiverData = await getUserByFinSmartId(selectedPayee.detail);
      if (!receiverData) {
        showToast("Invalid FinSmart ID for this contact!", "error");
        setProcessing(false);
        return;
      }
      
      setReceiverUser({
        uid: receiverData.userId,
        finsmartId: selectedPayee.detail,
        name: receiverData.name
      });
      // processing remains true to show modal
    } catch (error) {
      showToast("Failed to lookup receiver", "error");
      setProcessing(false);
    }
  };"""

code = code.replace(old_handle_send, new_handle_send)

old_modal = """      {/* Send Modal */}
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
      )}"""

new_modal = """      {/* Send Modal Step 1 */}
      {showSendModal && selectedPayee && !receiverUser && (
        <div className="modal-overlay">
          <div className="modal card">
            <div className="modal-header">
              <h3>Transfer to {selectedPayee.name}</h3>
              <button className="close-btn" onClick={() => setShowSendModal(false)} disabled={processing}>✕</button>
            </div>
            
            <form onSubmit={handleInitiateSend} className="modal-form">
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                 <img src={selectedPayee.avatar} alt={selectedPayee.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
                 <h4 style={{ marginTop: '0.5rem' }}>{selectedPayee.name}</h4>
                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>FinSmart ID: {selectedPayee.detail}</p>
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
              <button type="submit" className="btn btn-primary full-width" disabled={processing}>
                {processing ? 'Verifying...' : 'Next'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Secure Token Modal */}
      {receiverUser && currentUserDoc && (
        <SendMoneyModal 
          sender={{
            uid: auth.currentUser.uid,
            name: currentUserDoc.name,
            finsmartId: currentUserDoc.finsmartId
          }}
          receiver={receiverUser}
          amount={sendAmount}
          onClose={() => {
            setReceiverUser(null);
            setProcessing(false);
          }}
          onSuccess={() => {
            setReceiverUser(null);
            setShowSendModal(false);
            setSendAmount('');
            setProcessing(false);
            showToast(`Successfully transferred ₹${sendAmount} to ${selectedPayee.name}`);
            setBalance(prev => prev - Number(sendAmount));
          }}
        />
      )}"""

code = code.replace(old_modal, new_modal)
code = code.replace('placeholder="alex@example.com"', 'placeholder="FIN2026..."')
code = code.replace('Detail (Email/Account No)', 'Detail (Receiver\'s FinSmart ID)')

with open('src/pages/Transfer.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Transfer patched")
