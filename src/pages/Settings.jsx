import { useState, useEffect } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebaseClient';
import { updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { deleteUserAccount, resetPassword } from '../firebase/authFunctions';
import { getUser } from '../firebase/dbFunctions';

const Settings = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userDoc, setUserDoc] = useState(null);
  
  // States
  const [message, setMessage] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const isEmailProvider = auth?.currentUser?.providerData?.[0]?.providerId === 'password';

  useEffect(() => {
    if (!auth?.currentUser) {
      setLoading(false);
      return;
    }
    getUser(auth.currentUser.uid).then(doc => {
      setUserDoc(doc);
      setLoading(false);
    });
  }, []);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  /*  Change Email  */
  const handleEmailChange = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) { showMsg('Please enter a new email address.', 'error'); return; }
    if (!currentPassword) { showMsg('Please enter your current password to verify.', 'error'); return; }
    setEmailSaving(true);
    try {
      const u = auth.currentUser;
      const credential = EmailAuthProvider.credential(u.email, currentPassword);
      await reauthenticateWithCredential(u, credential);
      await updateEmail(u, newEmail.trim());
      showMsg(`Email changed to ${newEmail.trim()} successfully!`);
      setShowEmailModal(false);
      setNewEmail('');
      setCurrentPassword('');
    } catch (err) {
      const c = err.code;
      if (c === 'auth/wrong-password' || c === 'auth/invalid-credential') showMsg('Current password is incorrect.', 'error');
      else if (c === 'auth/email-already-in-use') showMsg('This email is already in use by another account.', 'error');
      else if (c === 'auth/invalid-email') showMsg('Please enter a valid email address.', 'error');
      else if (c === 'auth/requires-recent-login') showMsg('Please log out and log back in, then try again.', 'error');
      else showMsg(err.message || 'Failed to change email.', 'error');
    } finally { setEmailSaving(false); }
  };

  /*  Send Password Reset  */
  const handleSendPasswordReset = async () => {
    setResetLoading(true);
    try {
      await resetPassword(auth.currentUser.email);
      setResetSent(true);
      showMsg(`Password reset email sent to ${auth.currentUser.email}`);
    } catch {
      showMsg('Failed to send reset email.', 'error');
    } finally { setResetLoading(false); }
  };

  /*  Delete Account  */
  const handleDeleteAccountClick = () => {
    if (userDoc?.walletBalance > 0) {
      setShowDeleteWarning(true);
    } else {
      executeDeleteAccount();
    }
  };

  const executeDeleteAccount = async () => {
    const confirmed = window.confirm(
      'WARNING: This will permanently delete your account, all transactions, budgets, and wallet data.\n\nThis action CANNOT be undone. Are you sure?'
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deleteUserAccount();
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') showMsg('Please log out and log back in before deleting your account.', 'error');
      else showMsg('Failed to delete account. Please try again.', 'error');
      setDeleting(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid rgba(0,201,167,0.15)', borderTop: '4px solid #00C9A7', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="page-content profile-page">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.75rem', gap: '1rem' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '0.5rem 1rem', cursor: 'pointer', color: 'var(--text-primary)' }}
        >
          <ArrowLeft size={16} style={{marginRight:'4px'}}/> Back
        </button>
        <h1 style={{ margin: 0 }}>Settings</h1>
      </div>

      {message && (
        <div className={`profile-toast ${message.type}`}>
          {message.type === 'success' ? '' : '️'} {message.text}
        </div>
      )}

      <div className="profile-grid">

        {isEmailProvider && (
          <div className="card profile-card">
            <h3>Email &amp; Password</h3>
            <p className="profile-card-sub">Manage your login credentials.</p>
            
            <div className="profile-info-row" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <p className="profile-info-label">Current Email</p>
                <p className="profile-info-value" style={{ wordBreak: 'break-all' }}>{auth.currentUser?.email}</p>
              </div>
              <button className="profile-btn-outline" onClick={() => setShowEmailModal(true)} style={{ flexShrink: 0 }}>
                Change Email
              </button>
            </div>

            <div className="profile-info-row" style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <div>
                <p className="profile-info-label">Password</p>
                <p className="profile-info-value">••••••••••</p>
              </div>
              <button className="profile-btn-outline" onClick={handleSendPasswordReset} disabled={resetLoading || resetSent}>
                {resetSent ? ' Sent!' : resetLoading ? 'Sending…' : 'Reset Password'}
              </button>
            </div>
          </div>
        )}

        <div className="card profile-card">
          <h3>Danger Zone</h3>
          <p className="profile-card-sub">Permanently delete your account and all data.</p>
          <div style={{ marginTop: '1.5rem' }}>
            <button className="profile-btn-danger" onClick={handleDeleteAccountClick} disabled={deleting} style={{ width: '100%' }}>
              {deleting ? 'Deleting…' : 'Delete Account'}
            </button>
          </div>
        </div>
      </div>

      {/* Email Change Modal */}
      {showEmailModal && (
        <div className="modal-overlay">
          <div className="modal card">
            <div className="modal-header">
              <h3>Change Email Address</h3>
              <button className="close-btn" onClick={() => setShowEmailModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleEmailChange} className="profile-form" style={{ padding: '1.5rem' }}>
              <div className="profile-field">
                <label>New Email Address</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Enter new email" required />
              </div>
              <div className="profile-field">
                <label>Current Password <span style={{ opacity: 0.6, fontWeight: 400 }}>(to verify identity)</span></label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter your current password" required />
              </div>
              <button type="submit" className="profile-btn-primary full-width" disabled={emailSaving} style={{ marginTop: '1rem' }}>
                {emailSaving ? 'Changing…' : 'Confirm Email Change'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Balance Warning Modal */}
      {showDeleteWarning && (
        <div className="modal-overlay">
          <div className="modal card">
            <div className="modal-header">
              <h3>Action Required</h3>
              <button className="close-btn" onClick={() => setShowDeleteWarning(false)}><X size={18} /></button>
            </div>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ marginBottom: '1.5rem', fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
                You need transfer the remaining balance before account deletion.
              </p>
              <button className="btn btn-primary full-width" onClick={() => navigate('/transfer')}>
                 Transfer Money
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
