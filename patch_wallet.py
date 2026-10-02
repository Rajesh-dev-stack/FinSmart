import re

with open('src/pages/Wallet.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

import_str = "import SendMoneyModal from '../components/SendMoneyModal';\nimport { listenToWalletBalance } from '../firebase/dbFunctions';\n"
code = code.replace("import { \n  getUser,", import_str + "import { \n  getUser,")

old_effect = """  useEffect(() => {
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
  }, []);"""

new_effect = """  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    let unsubBalance;
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchWalletData(user.uid);
        unsubBalance = listenToWalletBalance(user.uid, (newBal) => {
          setBalance(newBal);
        });
      } else {
        setLoading(false);
      }
    });
    return () => {
      unsubscribe();
      if (unsubBalance) unsubBalance();
    };
  }, []);"""
code = code.replace(old_effect, new_effect)

handle_start = code.find('  const handleSendMoney = async (e) => {')
handle_end = code.find('  if (loading) {', handle_start)
if handle_start != -1 and handle_end != -1:
    code = code[:handle_start] + code[handle_end:]

code = code.replace("<button className=\"btn btn-secondary\" onClick={() => navigate('/transfer')}>\n              ↗ Transfer Money\n            </button>", "<button className=\"btn btn-secondary\" onClick={() => setShowSendModal(true)}>\n              ↗ Transfer Money\n            </button>")

old_send_modal = """      {/* 3. Send Money Modal */}
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
      )}"""

new_send_modal = """      {/* 3. Send Money Modal */}
      {showSendModal && (
        <SendMoneyModal 
          senderUid={auth.currentUser.uid}
          senderBalance={balance}
          onClose={() => setShowSendModal(false)}
          onSuccess={(amt) => {
            setShowSendModal(false);
            fetchWalletData(auth.currentUser.uid, true);
          }}
        />
      )}"""
code = code.replace(old_send_modal, new_send_modal)

old_filter = """  const filteredTransactions = filterMonth === 'this-month' 
    ? transactions.filter(t => t.date.startsWith(currentMonthPrefix))
    : transactions;"""
new_filter = """  const filteredTransactions = (filterMonth === 'this-month' 
    ? transactions.filter(t => t.date.startsWith(currentMonthPrefix))
    : transactions).filter(t => t.category === 'Money Sent' || t.category === 'Money Received' || t.category === 'Transfer');"""
code = code.replace(old_filter, new_filter)

with open('src/pages/Wallet.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Patched wallet')
