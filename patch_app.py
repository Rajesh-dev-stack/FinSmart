import re

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

import_str = "import { listenForIncomingTransfer, cleanExpiredTokens } from './utils/tokenTransfer';\n"
code = code.replace("import { processDailyInterest } from './firebase/dbFunctions';", "import { processDailyInterest } from './firebase/dbFunctions';\n" + import_str)

# In function App(), add state for transfer notification
state_str = "  const [interestMsg, setInterestMsg] = useState(null);\n  const [transferMsg, setTransferMsg] = useState(null);"
code = code.replace("  const [interestMsg, setInterestMsg] = useState(null);", state_str)

# Add useEffect for incoming transfers
effect_str = """  useEffect(() => {
    if (!user) return;

    // Listen for incoming transfers
    const unsubscribe = listenForIncomingTransfer(
      user.uid,
      (transfer) => {
        // Show instant notification
        setTransferMsg(`💸 ₹${transfer.amount} received from ${transfer.from}!`);
        setTimeout(() => setTransferMsg(null), 8000);
        
        // Refresh wallet balance could be added here if App tracks it
      }
    );

    // Clean expired tokens every 5 min
    const cleanupInterval = setInterval(cleanExpiredTokens, 300000);

    return () => {
      unsubscribe();
      clearInterval(cleanupInterval);
    };
  }, [user]);"""

code = code.replace("  const isAuthPage = AUTH_ROUTES.includes(location.pathname);", "  const isAuthPage = AUTH_ROUTES.includes(location.pathname);\n\n" + effect_str)

# Add toast UI for transferMsg
toast_ui = """      {/* Interest Credited Toast */}
      {interestMsg && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem',
          background: 'var(--mint)', color: '#fff',
          padding: '1rem 1.5rem', borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-lg)', zIndex: 9999,
          fontWeight: 600, animation: 'slideUp 0.3s ease'
        }}>
          🏦 {interestMsg}
        </div>
      )}

      {/* Incoming Transfer Toast */}
      {transferMsg && (
        <div style={{
          position: 'fixed', bottom: '6rem', right: '2rem',
          background: 'var(--primary)', color: '#fff',
          padding: '1rem 1.5rem', borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-lg)', zIndex: 9999,
          fontWeight: 600, animation: 'slideUp 0.3s ease'
        }}>
          {transferMsg}
        </div>
      )}"""

code = code.replace("      {/* Interest Credited Toast */}", "").replace("""      {interestMsg && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem',
          background: 'var(--mint)', color: '#fff',
          padding: '1rem 1.5rem', borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-lg)', zIndex: 9999,
          fontWeight: 600, animation: 'slideUp 0.3s ease'
        }}>
          🏦 {interestMsg}
        </div>
      )}""", toast_ui)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("App.jsx patched")
