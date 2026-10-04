import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeProvider';
import { submitSupportTicket, getUserTickets } from '../firebase/dbFunctions';

const SpinnerInline = ({ size = 20 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    border: '3px solid rgba(0,201,167,0.15)',
    borderTop: '3px solid #00C9A7',
    animation: 'spin 0.8s linear infinite',
    margin: 'auto'
  }} />
);

const Support = ({ user }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [view, setView] = useState('new'); // 'new' or 'queries'
  
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    category: '',
    message: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [createdTicketId, setCreatedTicketId] = useState('');

  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    if (view === 'queries' && user?.uid) {
      loadMyTickets();
    }
  }, [view, user]);

  async function loadMyTickets() {
    setLoadingTickets(true);
    try {
      const tickets = await getUserTickets(user.uid);
      setMyTickets(tickets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name || !formData.email || !formData.category || formData.message.length < 20) {
      setError('Please fill all fields. Message must be at least 20 characters.');
      return;
    }

    if (!user?.uid) {
      setError('You must be logged in to submit a ticket.');
      return;
    }

    setLoading(true);

    try {
      const ticketId = `SUP-${Math.floor(100000 + Math.random() * 900000)}`;
      await submitSupportTicket({
        ticketId,
        userId: user.uid,
        name: formData.name,
        email: formData.email,
        category: formData.category,
        message: formData.message,
        status: 'open',
        reply: '',
        createdAt: new Date().toISOString()
      });

      setCreatedTicketId(ticketId);
      setSuccess(true);
      setFormData({ name: user?.displayName || '', email: user?.email || '', category: '', message: '' });

    } catch (err) {
      console.error("Support form submission error:", err);
      setError(`Failed to submit ticket: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button 
          className={`btn ${view === 'queries' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setView(view === 'new' ? 'queries' : 'new')}
          style={view === 'new' ? {
            backgroundColor: 'rgba(0, 201, 167, 0.15)',
            color: '#00C9A7',
            border: '1px solid #00C9A7',
            fontWeight: '600'
          } : {}}
        >
          {view === 'new' ? 'My Queries' : 'New Ticket'}
        </button>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        
        {view === 'new' ? (
          <>
            <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Welcome to FinSmart Customer Support 
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              We typically reply within 24 hours
            </p>

            {success ? (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                background: isDark ? 'rgba(0, 201, 167, 0.1)' : 'rgba(0, 201, 167, 0.05)',
                border: '1px solid var(--primary)',
                borderRadius: 'var(--r-md)'
              }}>
                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Ticket Submitted!</h3>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                  Your Support ID: <span style={{ color: 'var(--primary)' }}>{createdTicketId}</span>
                </p>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Thank you for reaching out. We've received your request and our admins will review it shortly.
                  You can track the status in the "My Queries" tab.
                </p>
                <button 
                  className="btn btn-outline" 
                  style={{ marginTop: '1.5rem' }}
                  onClick={() => setSuccess(false)}
                >
                  Submit Another Ticket
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {error && (
                  <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--r-sm)' }}>
                    {error}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Full Name</label>
                  <input 
                    type="text" 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }}
                    placeholder="e.g., Your Name"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Email Address</label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }}
                    placeholder="example@gmail.com"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Issue Category</label>
                  <select 
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)' }}
                  >
                    <option value="" disabled>Select a category</option>
                    <option value="Account Problem">Account Problem</option>
                    <option value="Transaction Issue">Transaction Issue</option>
                    <option value="Wallet Problem">Wallet Problem</option>
                    <option value="Reward System Issue">Reward System Issue</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Message (Min 20 characters)</label>
                  <textarea 
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', resize: 'vertical' }}
                    placeholder="Describe your issue in detail..."
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.8rem', fontSize: '1rem' }}>
                  {loading ? <SpinnerInline size={24} /> : 'Submit Ticket'}
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: '1.5rem' }}>My Support Queries</h2>
            
            {loadingTickets ? (
              <div style={{ padding: '2rem 0', textAlign: 'center' }}>
                <SpinnerInline size={32} />
              </div>
            ) : myTickets.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>You have not submitted any support tickets yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {myTickets.map(ticket => (
                  <div key={ticket.ticketId} style={{ 
                    border: '1px solid var(--border)', 
                    borderRadius: 'var(--r-md)', 
                    padding: '1.5rem',
                    background: 'var(--bg)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--primary)' }}>{ticket.ticketId}</span>
                      <span style={{ 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '1rem', 
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background: ticket.status === 'open' ? 'rgba(245,158,11,0.1)' : 'rgba(0,201,167,0.1)',
                        color: ticket.status === 'open' ? '#f59e0b' : 'var(--success)'
                      }}>
                        {ticket.status}
                      </span>
                    </div>
                    
                    <h4 style={{ marginBottom: '0.5rem' }}>{ticket.category}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                      {ticket.message}
                    </p>
                    
                    {ticket.reply && (
                      <div style={{ 
                        background: isDark ? 'rgba(0, 201, 167, 0.1)' : 'rgba(0, 201, 167, 0.05)', 
                        padding: '1rem', 
                        borderRadius: 'var(--r-sm)',
                        borderLeft: '4px solid var(--primary)'
                      }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>Admin Reply:</p>
                        <p style={{ fontSize: '0.9rem' }}>{ticket.reply}</p>
                      </div>
                    )}
                    
                    <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                      {new Date(ticket.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default Support;
