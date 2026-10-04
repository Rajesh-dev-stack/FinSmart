import { useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUpWithEmail, loginWithGoogle, loginWithEmail } from '../firebase/authFunctions';
import { auth } from '../firebase/firebaseClient';
import { signOut } from 'firebase/auth';
import { Sparkles, Wallet, BellRing, PieChart, Award, BarChart2, ShieldCheck } from 'lucide-react';
import './Auth.css';

/*  Inline Chart / Growth SVG illustration  */
const GrowthSVG = () => (
  <svg viewBox="0 0 260 240" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    {/* Shadow */}
    <ellipse cx="130" cy="228" rx="80" ry="10" fill="rgba(0,0,0,0.18)"/>
    {/* Phone frame */}
    <rect x="60" y="20" width="140" height="200" rx="22" fill="url(#phoneGrad)"/>
    <rect x="65" y="25" width="130" height="190" rx="18" fill="#1C1F2E"/>
    {/* Screen content */}
    <rect x="75" y="40" width="110" height="16" rx="6" fill="rgba(255,255,255,0.08)"/>
    <rect x="75" y="62" width="70" height="10" rx="4" fill="rgba(255,255,255,0.12)"/>
    {/* Balance */}
    <text x="75" y="95" fill="white" fontSize="11" fontWeight="700" opacity="0.6">Total Balance</text>
    <text x="75" y="115" fill="white" fontSize="18" fontWeight="800">4,250</text>
    {/* Mini chart bars */}
    <rect x="75"  y="145" width="14" height="35" rx="4" fill="url(#barGrad1)" opacity="0.7"/>
    <rect x="95"  y="130" width="14" height="50" rx="4" fill="url(#barGrad1)" opacity="0.85"/>
    <rect x="115" y="138" width="14" height="42" rx="4" fill="url(#barGrad1)" opacity="0.7"/>
    <rect x="135" y="120" width="14" height="60" rx="4" fill="url(#barGrad1)"/>
    <rect x="155" y="128" width="14" height="52" rx="4" fill="url(#barGrad2)" opacity="0.9"/>
    {/* Trend line */}
    <polyline points="82,160 102,145 122,152 142,135 162,142" stroke="#00C9A7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* Dots */}
    <circle cx="82"  cy="160" r="3" fill="#00C9A7"/>
    <circle cx="142" cy="135" r="4" fill="#00C9A7"/>
    <circle cx="162" cy="142" r="3" fill="#00C9A7"/>
    {/* Notch */}
    <rect x="110" y="24" width="40" height="6" rx="3" fill="rgba(255,255,255,0.15)"/>
    {/* Floating badge */}
    <rect x="110" y="50" width="100" height="36" rx="10" fill="white" opacity="0.95"/>
    <text x="118" y="64" fill="#00C9A7" fontSize="9" fontWeight="800">Saved 850</text>
    <text x="118" y="78" fill="#718096" fontSize="8">this month </text>
    {/* Floating coin */}
    <circle cx="58"  cy="150" r="20" fill="#FFD166"/>
    <circle cx="58"  cy="150" r="14" fill="#FFC233"/>
    <text x="52" y="155" fill="#9A6A00" fontSize="12" fontWeight="bold">$</text>
    {/* Defs */}
    <defs>
      <linearGradient id="phoneGrad" x1="60" y1="20" x2="200" y2="220" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6C63FF"/>
        <stop offset="1" stopColor="#A89AE3"/>
      </linearGradient>
      <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
        <stop stopColor="#6C63FF" stopOpacity="0.9"/>
        <stop offset="1" stopColor="#A89AE3" stopOpacity="0.4"/>
      </linearGradient>
      <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
        <stop stopColor="#00C9A7" stopOpacity="0.9"/>
        <stop offset="1" stopColor="#00C9A7" stopOpacity="0.3"/>
      </linearGradient>
    </defs>
  </svg>
);

const features = [
  { icon: <Sparkles size={18} />, text: 'AI Spending Analyzer' },
  { icon: <Wallet size={18} />, text: 'Digital Wallet' },
  { icon: <BellRing size={18} />, text: 'Budget Alerts' },
  { icon: <PieChart size={18} />, text: 'Smart Budgeting' },
  { icon: <Award size={18} />, text: 'FinCoins Rewards' },
  { icon: <BarChart2 size={18} />, text: 'Expense Reports' },
];

const Signup = () => {
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [emailExists, setEmailExists] = useState(false); 
  const navigate = useNavigate();

  // Admin Modal states
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword]   = useState('');
  const [adminLoading, setAdminLoading]     = useState(false);
  const [adminError, setAdminError]         = useState(null);

  const passwordStrength = useMemo(() => {
    if (!password) return { level: 0, text: '', color: 'transparent' };
    if (password.length < 6) return { level: 1, text: 'Weak', color: '#FF5252' };
    if (password.length < 10 || !/\d/.test(password)) return { level: 2, text: 'Medium', color: '#FFD740' };
    return { level: 3, text: 'Strong', color: '#00E676' };
  }, [password]);

    const handleAdminShortcut = () => {
    setShowAdminModal(true);
    setAdminError(null);
    setAdminPassword('');
  };

  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault();
    if (!adminPassword) return;
    setAdminLoading(true); setAdminError(null);
    
    // Static Admin Password Check
    if (adminPassword === 'Rajesh7679@') {
      localStorage.setItem('staticAdmin', 'true');
      window.location.href = '/admin-support'; 
      return;
    }
    
    // Fallback
    try {
      await loginWithEmail('rajesh.professional817@gmail.com', adminPassword);
      navigate('/admin-support');
    } catch (err) {
      setAdminError('Invalid admin password.');
    } finally { 
      setAdminLoading(false); 
    }
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter your full name.'); return; }
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (email.toLowerCase() === 'rajesh.professional817@gmail.com') {
      setError('Admins must use the Admin Login portal.');
      return;
    }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError(null); setEmailExists(false);
    try {
      await signUpWithEmail(email, password, name.trim());
      navigate('/dashboard');
    } catch (err) {
      console.error('Signup error:', err);
      const c = err.code;
      if (c === 'auth/email-already-in-use') {
        setEmailExists(true);
      } else if (c === 'auth/weak-password')
        setError('Password is too weak. Use at least 6 characters.');
      else if (c === 'auth/invalid-email')
        setError('Please enter a valid email address.');
      else if (c === 'auth/operation-not-allowed')
        setError('Email sign-up is not enabled. Please contact support.');
      else if (c === 'auth/network-request-failed')
        setError('Network error. Please check your internet connection.');
      else
        setError(err.message || 'Sign up failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleGoogleSignup = async () => {
    setLoading(true); setError(null);
    try { 
      const u = await loginWithGoogle(); 
      if (u && u.email === 'rajesh.professional817@gmail.com') {
        await signOut(auth);
        setError('Admins must use the Admin Login portal.');
        setLoading(false);
        return;
      }
      navigate('/dashboard'); 
    }
    catch (err) { setError('Google sign-up failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      {/*  LEFT: Form  */}
      <div className="auth-left">

        {/* Brand */}
        <div className="auth-brand-block">
          <img src="/logo.png?v=2" alt="FinSmart" className="auth-brand-icon" />
          <div className="auth-brand-text">
            <h2 className="auth-brand-title">
              <span className="brand-fin">Fin</span><span className="brand-smart">Smart</span>
            </h2>
            <span className="auth-brand-subtitle">Digital Wallet</span>
          </div>
        </div>

        {!showAdminModal ? (
          <>
            <h2 className="auth-heading">Create your account</h2>
        <p className="auth-subheading">Smart money management for college students </p>

        {/*  Existing User Banner  */}
        {emailExists && (
          <div className="auth-exists-banner">
            <div className="auth-exists-icon"></div>
            <div className="auth-exists-content">
              <strong>Account already exists!</strong>
              <p>An account with <span className="auth-exists-email">{email}</span> already exists.</p>
            </div>
            <Link to="/login" className="auth-exists-login-btn">Sign In</Link>
          </div>
        )}

        {error && !emailExists && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleEmailSignup}>
          <div className="auth-field">
            <span className="auth-field-icon"></span>
            <input
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={e => setName(e.target.value)}
              required autoComplete="name"
              autoFocus
            />
          </div>

          <div className="auth-field">
            <span className="auth-field-icon"></span>
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required autoComplete="email"
            />
          </div>

          <div className="auth-field" style={{ marginBottom: password ? '0.5rem' : '1.25rem' }}>
            <span className="auth-field-icon"></span>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Create a password (min 6 chars)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required autoComplete="new-password"
            />
            <span className="auth-field-suffix" onClick={() => setShowPass(!showPass)} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
              {showPass ? '' : ''}
            </span>
          </div>

          {password && (
            <div style={{ marginBottom: '1.25rem', padding: '0 0.5rem' }}>
              <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '6px' }}>
                <div style={{ flex: 1, background: passwordStrength.level >= 1 ? passwordStrength.color : 'rgba(255,255,255,0.1)', borderRadius: '2px', transition: 'all 0.3s' }} />
                <div style={{ flex: 1, background: passwordStrength.level >= 2 ? passwordStrength.color : 'rgba(255,255,255,0.1)', borderRadius: '2px', transition: 'all 0.3s' }} />
                <div style={{ flex: 1, background: passwordStrength.level >= 3 ? passwordStrength.color : 'rgba(255,255,255,0.1)', borderRadius: '2px', transition: 'all 0.3s' }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: passwordStrength.color, fontWeight: '500' }}>{passwordStrength.text} Password</span>
            </div>
          )}

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
          
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.75rem' }}>
            By creating an account you agree to our Terms
          </p>
        </form>

        <div className="auth-divider" style={{ margin: '1.25rem 0' }}>OR</div>

        <button className="auth-btn-google" onClick={handleGoogleSignup} disabled={loading}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
          Sign up with Google
        </button>

        <p className="auth-form-footer" style={{ marginTop: '1.5rem' }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button 
              type="button" 
              onClick={handleAdminShortcut} 
              style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s ease', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-secondary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
            >
              <ShieldCheck size={14} /> Admin Login
            </button>
          </div>
        </>
        ) : (
          <div className="forgot-panel">
            <button type="button" className="forgot-back-btn" onClick={() => setShowAdminModal(false)}>
               Back to Registration
            </button>
            <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '1rem' }}>
              <ShieldCheck size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
              <h2 className="auth-heading">Admin Access</h2>
            </div>

            {adminError && <div className="auth-error"> {adminError}</div>}

            <form className="auth-form" onSubmit={handleAdminLoginSubmit}>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Enter admin password"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  required autoFocus
                />
              </div>

              <button type="submit" className="btn btn-primary full-width" disabled={adminLoading} style={{ marginTop: '1.5rem', background: 'var(--danger)', borderColor: 'var(--danger)', color: 'white' }}>
                {adminLoading ? 'Authenticating...' : 'Access Dashboard'}
              </button>
            </form>
          </div>
        )}

        <p className="auth-copyright">Made with love by Team FinSmart | &copy; 2026 FinSmart</p>
      </div>

      {/*  RIGHT: Feature Showcase  */}
      <div className="auth-right">
        <div className="auth-right-blob blob-1"></div>
        <div className="auth-right-blob blob-2"></div>
        <div className="auth-right-blob blob-3"></div>

        <div className="deco-float deco-ring-1"></div>
        <div className="deco-float deco-ring-2"></div>
        <div className="deco-float deco-ring-3"></div>
        <div className="deco-dot dot-1"></div>
        <div className="deco-dot dot-2"></div>
        <div className="deco-dot dot-3"></div>

        <div className="auth-right-top">
          <div className="auth-illustration-wrap">
            <GrowthSVG />
          </div>
        </div>

        <div className="auth-right-bottom">
          <p className="auth-tagline">Take control of your<br />financial future</p>

          <div className="auth-features-grid">
            {features.map(f => (
              <div key={f.text} className="auth-feature-item">
                <div className="auth-feature-icon">{f.icon}</div>
                <span className="auth-feature-text">{f.text}</span>
              </div>
            ))}
          </div>

          <div className="auth-indicator-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
