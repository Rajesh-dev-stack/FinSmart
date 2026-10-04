import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { loginWithEmail, loginWithGoogle, resetPassword } from '../firebase/authFunctions';
import { Sparkles, Award, ShieldCheck, BellRing, BarChart2, MonitorSmartphone } from 'lucide-react';
import './Auth.css';

const features = [
  { icon: <Sparkles size={18} />, text: 'AI Spending Analyzer' },
  { icon: <Award size={18} />, text: 'FinCoins Reward System' },
  { icon: <ShieldCheck size={18} />, text: 'Firebase Secured' },
  { icon: <BellRing size={18} />, text: 'Smart Budget Alerts' },
  { icon: <BarChart2 size={18} />, text: 'Monthly Reports' },
  { icon: <MonitorSmartphone size={18} />, text: 'Live across devices' },
];

const Login = () => {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [remember, setRemember]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const passwordRef = useRef(null);

  // Forgot Password states
  const [showForgot, setShowForgot]         = useState(false);
  const [resetEmail, setResetEmail]         = useState('');
  const [resetLoading, setResetLoading]     = useState(false);
  const [resetSuccess, setResetSuccess]     = useState(false);
  const [resetError, setResetError]         = useState(null);
  // Admin Modal states
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword]   = useState('');
  const [adminLoading, setAdminLoading]     = useState(false);
  const [adminError, setAdminError]         = useState(null);

  const navigate = useNavigate();

  /*  Login  */
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
      window.location.href = '/admin-support'; // Force a full reload to apply static admin state
      return;
    }
    
    // Fallback to normal auth if they typed the real one
    try {
      await loginWithEmail('rajesh.professional817@gmail.com', adminPassword);
      navigate('/admin-support');
    } catch (err) {
      setAdminError('Invalid admin password.');
    } finally { 
      setAdminLoading(false); 
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true); setError(null);
    try {
      await loginWithEmail(email, password);
      navigate('/dashboard');
    } catch (err) {
      const c = err.code;
      if (c === 'auth/invalid-credential' || c === 'auth/user-not-found' || c === 'auth/wrong-password')
        setError('Invalid email or password. Please try again.');
      else if (c === 'auth/too-many-requests')
        setError('Too many attempts. Please wait and try again.');
      else if (c === 'auth/user-disabled')
        setError('This account has been disabled. Contact support.');
      else
        setError(err.message || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  /*  Google Login  */
  const handleGoogleLogin = async () => {
    setLoading(true); setError(null);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      const c = err.code;
      if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request')
        setError('Sign-in popup was closed. Please try again.');
      else if (c === 'auth/popup-blocked')
        setError('Popup was blocked. Please allow popups for this site and try again.');
      else if (c === 'auth/unauthorized-domain')
        setError('Domain not authorized. Add localhost in Firebase Console  Authentication  Authorized Domains.');
      else if (c === 'auth/network-request-failed')
        setError('Network error. Please check your internet connection and try again.');
      else if (c === 'auth/user-disabled')
        setError('This Google account has been disabled.');
      else
        setError('Google sign-in failed. Please try again.');
      // Note: Firestore offline errors are handled silently in authFunctions.js
    } finally { setLoading(false); }
  };

  /*  Forgot Password  */
  const handleForgotOpen = () => {
    setShowForgot(true);
    setResetEmail(email); // pre-fill with whatever they typed
    setResetError(null);
    setResetSuccess(false);
  };

  const handleForgotClose = () => {
    setShowForgot(false);
    setResetSuccess(false);
    setResetError(null);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) { setResetError('Please enter your email address.'); return; }
    setResetLoading(true); setResetError(null);
    try {
      await resetPassword(resetEmail.trim());
      setResetSuccess(true);
    } catch (err) {
      const c = err.code;
      if (c === 'auth/user-not-found')
        setResetError('No account found with this email address.');
      else if (c === 'auth/invalid-email')
        setResetError('Please enter a valid email address.');
      else if (c === 'auth/too-many-requests')
        setResetError('Too many requests. Please wait a moment and try again.');
      else
        setResetError(err.message || 'Failed to send reset email.');
    } finally { setResetLoading(false); }
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

        {/*  ADMIN LOGIN PANEL  */}
        {showAdminModal ? (
          <div className="forgot-panel">
            <button type="button" className="forgot-back-btn" onClick={() => setShowAdminModal(false)}>
               Back to Sign In
            </button>
            <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '1rem' }}>
              <ShieldCheck size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
              <h2 className="auth-heading">Admin Access</h2>
            </div>

            {adminError && <div className="auth-error">,? {adminError}</div>}

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

              <Button type="submit" className="full-width" disabled={adminLoading} style={{ marginTop: '1.5rem', background: 'var(--danger)' }}>
                {adminLoading ? 'Authenticating...' : 'Access Dashboard'}
              </Button>
            </form>
          </div>
        ) : showForgot ? (
          <div className="forgot-panel">
            <button className="forgot-back-btn" onClick={handleForgotClose}>
               Back to Sign In
            </button>
            <h2 className="auth-heading" style={{ marginTop: '1rem' }}>Reset Password</h2>
            <p className="auth-subheading">
              Enter your email and we'll send you a reset link.
            </p>

            {resetSuccess ? (
              <div className="reset-success-box">
                <div className="reset-success-icon"></div>
                <strong>Email sent!</strong>
                <p>Check your inbox at <span>{resetEmail}</span> for the password reset link.</p>
                <p style={{ opacity: 0.6, fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  Didn't receive it? Check spam or try again.
                </p>
                <button className="auth-btn-primary" style={{ marginTop: '1rem' }} onClick={handleForgotClose}>
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="auth-form">
                {resetError && <div className="auth-error">ï¸ {resetError}</div>}
                <div style={{ position: 'relative' }}>
                  <span className="auth-field-icon" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}></span>
                  <input
                    type="email"
                    className="input-field"
                    style={{ paddingLeft: '40px' }}
                    placeholder="Enter your email address"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    required autoFocus
                  />
                </div>
                <Button type="submit" disabled={resetLoading}>
                  {resetLoading ? 'Sendingâ€¦' : 'Send Reset Link'}
                </Button>
              </form>
            )}
          </div>
        ) : (
          /*  NORMAL LOGIN FORM  */
          <>
            <h2 className="auth-heading">Welcome back</h2>
            <p className="auth-subheading">Finally, a wallet that thinks! </p>

            {error && <div className="auth-error">ï¸ {error}</div>}

            <form className="auth-form" onSubmit={handleEmailLogin}>
              <div style={{ position: 'relative' }}>
                <span className="auth-field-icon" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}></span>
                <input
                  type="email"
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                  placeholder="Enter your email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required autoComplete="email"
                />
              </div>

              <div style={{ position: 'relative' }}>
                <span className="auth-field-icon" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}></span>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field"
                  style={{ paddingLeft: '40px', paddingRight: '40px' }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password"
                />
                <span className="auth-field-suffix" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)' }} onClick={() => setShowPass(!showPass)} role="button" tabIndex={0}>
                  {showPass ? '' : ''}
                </span>
              </div>

              <div className="auth-options-row">
                <label className="auth-remember">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                  Remember me
                </label>
                <span className="auth-forgot" onClick={handleForgotOpen} role="button" tabIndex={0}>
                  Forgot password?
                </span>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'Signing inâ€¦' : 'Sign in'}
              </Button>
            </form>

            <div className="auth-divider" style={{ margin: '1.25rem 0' }}>OR</div>

            <button className="auth-btn-google auth-glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '12px', width: '100%', background: 'transparent', borderColor: 'rgba(255,255,255,0.2)' }} onClick={handleGoogleLogin} disabled={loading}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px' }} />
              Sign in with Google
            </button>

            <p className="auth-form-footer" style={{ marginTop: '1.5rem' }}>
              You don't have an account yet? <Link to="/signup">Register</Link>
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
          <div className="auth-feature-cards-wrap">
            <div className="auth-glass-card card-1">
              <div className="icon"></div>
              <h4>AI Insights</h4>
              <p>Get personalized spending tips</p>
            </div>
            <div className="auth-glass-card card-2">
              <div className="icon"></div>
              <h4>Earn Rewards</h4>
              <p>Save money, earn FinCoins</p>
            </div>
            <div className="auth-glass-card card-3">
              <div className="icon"></div>
              <h4>Smart Budget</h4>
              <p>Never overspend again</p>
            </div>
          </div>
        </div>

        <div className="auth-right-bottom">
          <p className="auth-tagline">AI powered expense tracking built<br />for Indian college students</p>
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

export default Login;

