import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeProvider';
import { useRewards } from '../../context/RewardsProvider';
import RewardsModal from '../rewards/RewardsModal';
import './Navbar.css';
import { Coins, Settings } from 'lucide-react';

const Navbar = ({ title = 'Overview', user, onLogout }) => {
  const navigate = useNavigate();
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const { theme } = useTheme();
  const { totalCoins, isGlowing } = useRewards();

  // Dynamic notification logic
  const loadNotifications = async (quiet = false) => {
    if (!user) return;
    if (!quiet) setLoadingNotifs(true);
    try {
      const { getUser, getBudgets } = await import('../../firebase/dbFunctions');
      const notifs = [];
      
      // 1. Check low balance
      const uDoc = await getUser(user.uid);
      if (uDoc && (uDoc.walletBalance || 0) < 100) {
        notifs.push({ id: 'low_bal', type: 'warning', text: `Low wallet balance: ${uDoc.walletBalance || 0}. Consider depositing funds.` });
      }

      // 2. Check budgets
      const bdgts = await getBudgets(user.uid);
      bdgts.forEach((b, i) => {
        const spent = b.spent || 0;
        if (b.limit > 0 && spent >= b.limit * 0.8) {
          const pct = ((spent / b.limit) * 100).toFixed(0);
          notifs.push({ 
            id: `budget_${i}`, 
            type: pct >= 100 ? 'danger' : 'warning', 
            text: `You have used ${pct}% of your ${b.category} budget!` 
          });
        }
      });

      setNotifications(notifs);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      if (!quiet) setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications(true);
    }
  }, [user]);

  const handleNotifClick = () => {
    const nextState = !showNotif;
    setShowNotif(nextState);
    if (nextState) {
      loadNotifications();
    }
  };

  return (
    <>
      <header className="top-navbar">
      <h1 className="top-navbar-title">{title}</h1>

      <div className="top-navbar-right">
        {/* FinCoins */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button 
            className="navbar-icon-btn" 
            title="FinCoins" 
            onClick={() => setShowRewards(true)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              background: 'rgba(255,215,0,0.1)', color: '#FFD700', 
              borderColor: 'rgba(255,215,0,0.3)',
              padding: '8px 16px',
              borderRadius: 'var(--r-md)',
              minWidth: '90px',
              justifyContent: 'center',
              animation: isGlowing ? 'glow 1s infinite alternate' : 'none'
            }}
          >
            <span style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}><Coins size={18} fill="gold" /></span>
            <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '0.5px' }}>{totalCoins}</span>
          </button>
        </div>

        {/* Settings */}
        <button 
          className="navbar-icon-btn" 
          title="Settings" 
          onClick={() => navigate('/settings')}
        >
          <Settings size={18} />
        </button>

        {/* Notification */}
        <div style={{ position: 'relative' }}>
          <button className="navbar-icon-btn" title="Notifications" onClick={handleNotifClick}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {notifications.length > 0 && !showNotif && (
              <span style={{
                position: 'absolute', top: 0, right: 0, width: '8px', height: '8px',
                background: 'var(--red)', borderRadius: '50%'
              }}></span>
            )}
          </button>
          
          {showNotif && (
            <div style={{
              position: 'absolute', top: '120%', right: '-10px', width: '280px', 
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              padding: '1rem', zIndex: 100, textAlign: 'left',
              display: 'flex', flexDirection: 'column', gap: '10px'
            }}>
              <h4 style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: 'var(--text)' }}>Notifications</h4>
              {loadingNotifs ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Loading...</p>
              ) : notifications.length > 0 ? (
                notifications.map(n => (
                  <div key={n.id} style={{
                    padding: '8px', borderRadius: 'var(--r-sm)', fontSize: '0.8rem',
                    background: n.type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: n.type === 'danger' ? 'var(--red)' : '#F59E0B',
                    borderLeft: `3px solid ${n.type === 'danger' ? 'var(--red)' : '#F59E0B'}`
                  }}>
                    {n.text}
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>No new alerts.</p>
              )}
            </div>
          )}
        </div>



        {/* Avatar */}
        {user && (
          <Link to="/profile" className="navbar-avatar-wrap" title={user.name}>
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random&color=fff&bold=true`}
              alt={user.name}
              className="navbar-avatar"
            />
          </Link>
        )}
      </div>
    </header>
    {showRewards && <RewardsModal onClose={() => setShowRewards(false)} />}
    </>
  );
};

export default Navbar;
