import re

css = """
.transfer-page {
  animation: pageIn 0.35s ease forwards;
}

.transfer-page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
}

.wallet-balance-card {
  background: linear-gradient(135deg, var(--primary), var(--mint));
  color: white;
  padding: 2rem 2.5rem;
  border-radius: var(--r-xl);
  box-shadow: 0 10px 25px rgba(0, 201, 167, 0.2);
  margin-bottom: 2.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.wallet-balance-card::after {
  content: '';
  position: absolute;
  top: -50%;
  right: -10%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%);
  border-radius: 50%;
}

.wallet-balance-card h2 {
  font-size: 2.75rem;
  margin: 0.5rem 0 0;
  color: white;
}

.contacts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.contact-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 1.75rem 1rem;
  text-align: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
}

.contact-card:hover {
  transform: translateY(-5px);
  border-color: var(--primary);
  box-shadow: 0 10px 20px rgba(0, 201, 167, 0.08);
}

.contact-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  margin: 0 auto 1rem;
  display: block;
  box-shadow: 0 4px 10px rgba(0,0,0,0.08);
  border: 2px solid var(--surface);
  transition: border-color 0.3s;
}

.contact-card:hover .contact-avatar {
  border-color: var(--primary);
}

.contact-name {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.35rem;
  font-size: 1.05rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-detail {
  font-size: 0.85rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-contact-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: var(--bg);
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s;
  color: var(--danger);
  font-size: 0.8rem;
  font-weight: bold;
}

.contact-card:hover .delete-contact-btn {
  opacity: 1;
}

.delete-contact-btn:hover {
  background: rgba(239, 68, 68, 0.1);
}

@media (max-width: 768px) {
  .transfer-page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .wallet-balance-card {
    padding: 1.5rem;
  }
  
  .wallet-balance-card h2 {
    font-size: 2rem;
  }
  
  .contacts-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
"""

with open('src/pages/Transfer.css', 'w', encoding='utf-8') as f:
    f.write(css)

with open('src/pages/Transfer.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

new_ui = """    <div className="page transfer-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="transfer-page-header">
        <div>
          <h2 style={{ marginBottom: '0.25rem', fontSize: '2rem' }}>Transfer Money</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Instantly send funds to your saved contacts.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddPayeeModal(true)} style={{ padding: '0.8rem 1.5rem', fontWeight: 'bold' }}>
          + Add Contact
        </button>
      </div>

      <div className="wallet-balance-card">
        <div style={{ position: 'relative', zIndex: 2 }}>
          <p style={{ opacity: 0.85, fontSize: '0.95rem', margin: 0, fontWeight: 500 }}>Available Wallet Balance</p>
          <h2>₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
        </div>
        <div style={{ fontSize: '4.5rem', opacity: 0.2, position: 'relative', zIndex: 2 }}>
          💸
        </div>
      </div>

      <h3 style={{ marginBottom: '1.25rem' }}>Your Contacts</h3>
      <div className="contacts-grid">
        {contacts.map(c => (
          <div key={c.id} className="contact-card" onClick={() => handleOpenSend(c)}>
            {c.isCustom && (
              <button className="delete-contact-btn" onClick={(e) => handleDeletePayee(e, c)} title="Delete Contact">
                ✕
              </button>
            )}
            <img src={c.avatar} alt={c.name} className="contact-avatar" onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random&color=fff` }} />
            <div className="contact-name">{c.name}</div>
            <div className="contact-detail">{c.detail || 'Saved Contact'}</div>
          </div>
        ))}
      </div>

      {/* Send Modal */}"""

code = re.sub(r'<div className="page transfer-page">.*?\{/\* Send Modal \*/\}', new_ui, code, flags=re.DOTALL)

with open('src/pages/Transfer.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
