import re

with open('src/pages/Profile.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

id_section = """
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
"""

code = code.replace('<div className="profile-grid">', '<div className="profile-grid">\n' + id_section)

with open('src/pages/Profile.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print('Profile updated')
