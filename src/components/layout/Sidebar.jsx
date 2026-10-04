import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Home, PieChart, ListOrdered, BarChart2, Wallet, PiggyBank, Send, Sparkles, User, HelpCircle, LogOut } from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { to: '/dashboard', icon: <Home size={18} />, label: 'Overview' },
  { to: '/budget', icon: <PieChart size={18} />, label: 'Budget' },
  { to: '/transactions', icon: <ListOrdered size={18} />, label: 'Transactions' },
  { to: '/reports', icon: <BarChart2 size={18} />, label: 'Reports' },
];

const accountItems = [
  { to: '/wallet', icon: <Wallet size={18} />, label: 'Wallet' },
  { to: '/savings', icon: <PiggyBank size={18} />, label: 'Savings & Interest', isSub: true },
  { to: '/transfer', icon: <Send size={18} />, label: 'Transfer Money', isSub: true },
  { to: '/ai-insights', icon: <Sparkles size={18} />, label: 'AI Insights' },
  { to: '/profile', icon: <User size={18} />, label: 'Profile' },
  { to: '/support', icon: <HelpCircle size={18} />, label: 'Support' },
];

const Sidebar = ({ onLogout }) => {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    if (onLogout) onLogout();
  };

  return (
    <>
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <Link to="/dashboard" className="sidebar-brand-link">
            <img src="/logo.png?v=2" alt="FinSmart" className="sidebar-brand-icon" />
            <div className="sidebar-brand-text">
              <h2 className="sidebar-brand-title">
                <span className="brand-fin">Fin</span><span className="brand-smart">Smart</span>
              </h2>
              <span className="sidebar-brand-subtitle">Digital Wallet</span>
            </div>
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="sidebar-nav">
          <p className="sidebar-section-label">Main</p>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <span className="sidebar-icon" style={{display:'flex', alignItems:'center'}}>{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </NavLink>
          ))}

          <p className="sidebar-section-label" style={{ marginTop: '1.5rem' }}>Accounts</p>
          {accountItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              style={item.isSub ? { marginLeft: '1.5rem', paddingLeft: '1rem', borderLeft: '2px solid var(--border)' } : {}}
            >
              <span className="sidebar-icon" style={{display:'flex', alignItems:'center'}}>{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </NavLink>
          ))}
          
          {/* Logout Button */}
          <button 
            className="sidebar-link" 
            style={{ width: '100%', marginTop: '0.5rem', background: 'transparent', textAlign: 'left', color: 'var(--danger)' }} 
            onClick={() => setShowLogoutModal(true)}
          >
            <span className="sidebar-icon" style={{display:'flex', alignItems:'center'}}><LogOut size={18} /></span>
            <span className="sidebar-label">Logout</span>
          </button>
        </nav>

      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal card" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Are you want to log out?</h3>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleConfirmLogout} 
                style={{ flex: 1 }}
              >
                Yes
              </button>
              <button 
                className="btn" 
                onClick={() => setShowLogoutModal(false)} 
                style={{ flex: 1, border: '2px solid var(--danger)', color: 'var(--danger)', background: 'transparent' }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
