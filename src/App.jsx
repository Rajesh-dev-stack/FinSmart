import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate, Link, useNavigate } from 'react-router-dom';
import { auth } from './firebase/firebaseClient';
import { signOut } from 'firebase/auth';
import { processDailyInterest, listenForNewTransactions } from './firebase/dbFunctions';


// Pages
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import Savings from './pages/Savings';
import Transactions from './pages/Transactions';
import Budget from './pages/Budget';
import AIInsights from './pages/AIInsights';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Transfer from './pages/Transfer';
import Support from './pages/Support';
import AdminSupport from './pages/AdminSupport';

// Layout Components
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import LoadingScreen from './components/layout/LoadingScreen';

// Auth pages don't use sidebar
const AUTH_ROUTES = ['/login', '/signup', '/'];

import { Home, Wallet as WalletIcon, PieChart, User } from 'lucide-react';

const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  return (
    <nav className="mobile-nav">
      <Link to="/dashboard" className={`mobile-nav-item ${path === '/dashboard' ? 'active' : ''}`}>
        <Home size={20} />
        <span>Home</span>
      </Link>
      <Link to="/wallet" className={`mobile-nav-item ${path === '/wallet' ? 'active' : ''}`}>
        <WalletIcon size={20} />
        <span>Wallet</span>
      </Link>
      <Link to="/budget" className={`mobile-nav-item ${path === '/budget' ? 'active' : ''}`}>
        <PieChart size={20} />
        <span>Budget</span>
      </Link>
      <Link to="/profile" className={`mobile-nav-item ${path === '/profile' ? 'active' : ''}`}>
        <User size={20} />
        <span>Profile</span>
      </Link>
    </nav>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [staticAdmin, setStaticAdmin] = useState(() => localStorage.getItem('staticAdmin') === 'true');
  const [authReady, setAuthReady] = useState(false);
  const [interestMsg, setInterestMsg] = useState(null);
  const [transferToast, setTransferToast] = useState(null);
  const location = useLocation();

  const isAuthPage = AUTH_ROUTES.includes(location.pathname);

  useEffect(() => {
    if (!user) return;

    const unsubTxns = listenForNewTransactions(user.uid, (txn) => {
      if (txn.category === 'Money Received') {
         const senderName = txn.description.replace('Received from ', '');
         setTransferToast(`${txn.amount} received from ${senderName}!`);
         setTimeout(() => setTransferToast(null), 6000);
      } else if (txn.category === 'Money Sent') {
         const receiverName = txn.description.replace('Sent to ', '');
         setTransferToast(`Success: ${txn.amount} sent to ${receiverName}! +5 FinCoins`);
         setTimeout(() => setTransferToast(null), 6000);
      }
    });

    return () => unsubTxns();
  }, [user]);

  useEffect(() => {
    if (!user) return;

  }, [user]);

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u ? { name: u.displayName || 'User', email: u.email, photo: u.photoURL, uid: u.uid } : null);
      setAuthReady(true);
      
      // Process daily interest automatically on login
      if (u) {
        processDailyInterest(u.uid).then(amount => {
          if (amount > 0) {
            setInterestMsg(`+${amount.toFixed(2)} interest credited!`);
            setTimeout(() => setInterestMsg(null), 6000);
          }
        }).catch(err => console.error(err));
        
        // Evaluate monthly FinCoin rewards
        import('./firebase/dbFunctions').then(({ evaluateMonthlyRewards }) => {
          evaluateMonthlyRewards(u.uid);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (auth) await signOut(auth);
  };

  // Show spinning loading screen while Firebase resolves auth state
  if (!authReady) {
    return <LoadingScreen />;
  }

  const effectiveUser = staticAdmin ? { email: 'rajesh.professional817@gmail.com', uid: 'static-admin-uid', name: 'Admin', photo: '' } : user;
  
  // Redirect unauthenticated users
  if (!effectiveUser && !isAuthPage) {
    return <Navigate to="/login" replace />;
  }

  // Redirect authenticated users away from auth pages
  if (effectiveUser && isAuthPage) {
    if (effectiveUser.email === 'rajesh.professional817@gmail.com') {
      return <Navigate to="/admin-support" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // Auth pages (login/signup) - no sidebar
  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    );
  }

  // Main app - with sidebar
  const getPageTitle = (path) => {
    switch (path) {
      case '/dashboard': return 'Overview';
      case '/wallet': return 'Wallet';
      case '/savings': return 'Savings & Interest';
      case '/transfer': return 'Transfer Money';
      case '/transactions': return 'Transactions';
      case '/budget': return 'Budget';
      case '/ai-insights': return 'AI Insights';
      case '/reports': return 'Reports';
      case '/profile': return 'Profile';
      case '/settings': return 'Settings';
      case '/support': return 'Customer Support';
      case '/admin-support': return 'Admin Support';
      default: return 'FinSmart';
    }
  };

  return (
    <div className="app-shell">
      <Sidebar onLogout={handleLogout} user={effectiveUser} />
      <MobileNav />
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <Navbar title={getPageTitle(location.pathname)} user={effectiveUser} onLogout={handleLogout} />
        <div style={{ flex: 1 }}>
          <Routes>
          <Route path="/dashboard" element={<Dashboard user={effectiveUser} />} />
          <Route path="/wallet" element={<Wallet user={effectiveUser} />} />
          <Route path="/savings" element={<Savings user={effectiveUser} />} />
          <Route path="/transfer" element={<Transfer />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/ai-insights" element={<AIInsights />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<Profile user={effectiveUser} onProfileUpdate={(updates) => setUser(prev => ({ ...prev, ...updates }))} onLogout={handleLogout} />} />
          <Route path="/settings" element={<Settings user={effectiveUser} onLogout={handleLogout} />} />
          <Route path="/support" element={<Support user={effectiveUser} />} />
          <Route path="/admin-support" element={<AdminSupport user={effectiveUser} />} />
        </Routes>
        </div>
      </main>


      {/* Interest Credited Toast */}
      {interestMsg && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem',
          background: 'var(--mint)', color: '#fff',
          padding: '1rem 1.5rem', borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-lg)', zIndex: 9999,
          fontWeight: 600, animation: 'slideUp 0.3s ease'
        }}>
           {interestMsg}
        </div>
      )}

      {/* Transfer Notification Toast */}
      {transferToast && (
        <div style={{
          position: 'fixed', bottom: '6rem', right: '2rem',
          background: 'var(--primary)', color: '#fff',
          padding: '1rem 1.5rem', borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-lg)', zIndex: 9999,
          fontWeight: 600, animation: 'slideUp 0.3s ease'
        }}>
          {transferToast}
        </div>
      )}

            <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

export default App;
