import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebaseClient';
import { updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { updateAuthProfile, deleteUserAccount, resetPassword } from '../firebase/authFunctions';
import { getUser, generateUniqueFinSmartId, updateUserProfile } from '../firebase/dbFunctions';
import './Profile.css';

const Profile = ({ user, onLogout, onProfileUpdate }) => {
  const [loading, setLoading]   = useState(true);
  const [userDoc, setUserDoc]   = useState(null);
  const [name, setName]         = useState('');
    const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage]   = useState(null);

  // Email change states
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail]               = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [emailSaving, setEmailSaving]         = useState(false);

  // Password reset state
  const [resetSent, setResetSent]   = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const navigate = useNavigate();
  const isEmailProvider = auth?.currentUser?.providerData?.[0]?.providerId === 'password';

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (u) {
        setName(u.displayName || '');
                try {
          let doc = await getUser(u.uid);
          if (doc && !doc.finsmartId) {
            const newId = await generateUniqueFinSmartId(u.uid, doc.name || u.displayName || 'User', doc.email || u.email);
            await updateUserProfile(u.uid, { finsmartId: newId });
            doc.finsmartId = newId; // Update locally
          }
          setUserDoc(doc);
        } catch (e) { console.error(e); }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  /* ── Update Name ── */
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAuthProfile(name, '');
      if (onProfileUpdate) onProfileUpdate({ name, photo: '' });
      showMsg('Profile updated successfully!');
    } catch {
      showMsg('Failed to update profile.', 'error');
    } finally { setSaving(false); }
  };



  /* ── Change Email ── */
  const handleEmailChange = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) { showMsg('Please enter a new email address.', 'error'); return; }
    if (!currentPassword) { showMsg('Please enter your current password to verify.', 'error'); return; }
    setEmailSaving(true);
    try {
      const user = auth.currentUser;
      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      // Update email
      await updateEmail(user, newEmail.trim());
      showMsg(`Email changed to ${newEmail.trim()} successfully!`);
      setShowEmailChange(false);
      setNewEmail('');
      setCurrentPassword('');
    } catch (err) {
      const c = err.code;
      if (c === 'auth/wrong-password' || c === 'auth/invalid-credential')
        showMsg('Current password is incorrect.', 'error');
      else if (c === 'auth/email-already-in-use')
        showMsg('This email is already in use by another account.', 'error');
      else if (c === 'auth/invalid-email')
        showMsg('Please enter a valid email address.', 'error');
      else if (c === 'auth/requires-recent-login')
        showMsg('Please log out and log back in, then try again.', 'error');
      else
        showMsg(err.message || 'Failed to change email.', 'error');
    } finally { setEmailSaving(false); }
  };

  /* ── Send Password Reset ── */
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

  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  /* ── Delete Account ── */
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
      if (err.code === 'auth/requires-recent-login')
        showMsg('Please log out and log back in before deleting your account.', 'error');
      else
        showMsg('Failed to delete account. Please try again.', 'error');
      setDeleting(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid rgba(0,201,167,0.15)', borderTop: '4px solid #00C9A7', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!auth?.currentUser) return <div className="page-content"><div className="card empty-state"><p>Please log in to view your profile.</p></div></div>;

  const u = auth.currentUser;

  return (
    <div className="page-content profile-page">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <h1 style={{ marginBottom: '1.75rem' }}>Profile Settings</h1>

      {message && (
        <div className={`profile-toast ${message.type}`}>
          {message.type === 'success' ? '✅' : '⚠️'} {message.text}
        </div>
      )}

      <div className="profile-grid">

        {/* ── FinSmart ID ── */}
        <div className="card profile-card" style={{ background: 'linear-gradient(135deg, rgba(0, 201, 167, 0.05), rgba(0, 212, 255, 0.05))', borderColor: 'var(--primary)' }}>
          <h3>🏦 Your FinSmart ID</h3>
          <p className="profile-card-sub">Share this ID to receive money from anyone!</p>
          
          <div style={{ background: 'var(--bg)', padding: '1rem', borderRadius: 'var(--r-md)', textAlign: 'center', margin: '1.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {userDoc?.finsmartId && (
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${userDoc.finsmartId}&bgcolor=ffffff`} 
                alt="FinSmart ID QR"
                style={{ width: '120px', height: '120px', marginBottom: '1rem', borderRadius: '8px' }}
              />
            )}
            
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '1px', color: 'var(--primary)' }}>
              {userDoc?.finsmartId || 'Generating...'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className="profile-btn-primary" 
              style={{ flex: 1 }}
              onClick={() => {
                if (userDoc?.finsmartId) {
                  navigator.clipboard.writeText(userDoc.finsmartId);
                  showMsg('Copied! ✅');
                }
              }}
            >
              Copy ID 📋
            </button>
            
            {navigator.share && (
              <button 
                className="profile-btn-outline" 
                style={{ flex: 1 }}
                onClick={() => {
                  if (userDoc?.finsmartId) {
                    navigator.share({
                      title: 'My FinSmart ID',
                      text: `Send me money on FinSmart! My ID is ${userDoc.finsmartId}`,
                    }).catch(() => {});
                  }
                }}
              >
                Share 🔗
              </button>
            )}
          </div>
        </div>


        {/* ── Edit Name & Photo ── */}
        <div className="card profile-card">
          <h3>Personal Info</h3>
          <p className="profile-card-sub">Update your display name.</p>

          <div className="profile-avatar-wrap">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random&color=fff&bold=true&size=128`}
              alt="Avatar"
            />
          </div>

          <form onSubmit={handleUpdateProfile} className="profile-form">
            <div className="profile-field">
              <label>Display Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required />
            </div>
            <button type="submit" className="profile-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* ── Email & Password ── */}
        <div className="card profile-card">
          <h3>Email &amp; Password</h3>
          <p className="profile-card-sub">Manage your login credentials.</p>

          {/* Current Email */}
          <div className="profile-info-row">
            <div>
              <p className="profile-info-label">Current Email</p>
              <p className="profile-info-value">{u.email}</p>
            </div>
            {isEmailProvider && (
              <button
                className="profile-btn-outline"
                onClick={() => { setShowEmailChange(!showEmailChange); setCurrentPassword(''); setNewEmail(''); }}
              >
                {showEmailChange ? 'Cancel' : 'Change'}
              </button>
            )}
          </div>

          {/* Email Change Form */}
          {showEmailChange && isEmailProvider && (
            <form onSubmit={handleEmailChange} className="profile-form" style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <div className="profile-field">
                <label>New Email Address</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Enter new email" required />
              </div>
              <div className="profile-field">
                <label>Current Password <span style={{ opacity: 0.6, fontWeight: 400 }}>(to verify identity)</span></label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter your current password" required />
              </div>
              <button type="submit" className="profile-btn-primary" disabled={emailSaving}>
                {emailSaving ? 'Changing…' : 'Confirm Email Change'}
              </button>
            </form>
          )}

          {!isEmailProvider && (
            <p className="profile-field-hint" style={{ marginTop: '0.5rem' }}>
              Email changes are not available for Google sign-in accounts.
            </p>
          )}

          {/* Password Reset */}
          {isEmailProvider && (
            <div className="profile-info-row" style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <div>
                <p className="profile-info-label">Password</p>
                <p className="profile-info-value">••••••••••</p>
              </div>
              <button
                className="profile-btn-outline"
                onClick={handleSendPasswordReset}
                disabled={resetLoading || resetSent}
              >
                {resetSent ? '✅ Sent!' : resetLoading ? 'Sending…' : 'Reset'}
              </button>
            </div>
          )}
          {resetSent && (
            <p className="profile-field-hint" style={{ color: '#00C9A7', marginTop: '0.5rem' }}>
              ✅ Password reset email sent to {u.email}. Check your inbox.
            </p>
          )}
        </div>

        {/* ── Account Info & Danger Zone ── */}
        <div className="card profile-card">
          <h3>Account Info</h3>
          <div className="profile-info-row" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Member Since</span>
            <strong style={{ fontSize: '0.875rem' }}>
              {(() => {
                const dateStr = userDoc?.createdAt || auth?.currentUser?.metadata?.creationTime;
                if (!dateStr) return 'N/A';
                const d = new Date(dateStr);
                return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              })()}
            </strong>
          </div>
          <div className="profile-info-row" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Sign-in Method</span>
            <strong style={{ fontSize: '0.875rem' }}>
              {isEmailProvider ? '📧 Email & Password' : '🔵 Google'}
            </strong>
          </div>
          <div className="profile-info-row">
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Account Status</span>
            <span style={{ background: 'rgba(0,201,167,0.12)', color: '#00C9A7', padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 }}>Active</span>
          </div>

          {/* Danger Zone */}
          <div className="danger-zone">
            <h4>⚠️ Danger Zone</h4>
            <p>Permanently delete your account and all data. This cannot be undone.</p>
            <button className="profile-btn-danger" onClick={handleDeleteAccountClick} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete My Account'}
            </button>
          </div>
        </div>

      </div>

      {/* Balance Warning Modal */}
      {showDeleteWarning && (
        <div className="modal-overlay">
          <div className="modal card">
            <div className="modal-header">
              <h3>Action Required</h3>
              <button className="close-btn" onClick={() => setShowDeleteWarning(false)}>✕</button>
            </div>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ marginBottom: '1.5rem', fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
                You need transfer the remaining balance before account deletion.
              </p>
              <button className="btn btn-primary full-width" onClick={() => navigate('/transfer')}>
                ↗ Transfer Money
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
