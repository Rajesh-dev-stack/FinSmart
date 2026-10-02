import { useState, useEffect } from 'react';
import { getAllTickets, updateTicketStatus, replyToTicket } from '../firebase/dbFunctions';
import { useTheme } from '../context/ThemeProvider';

const SpinnerInline = ({ size = 28 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    border: '3px solid rgba(0,201,167,0.15)',
    borderTop: '3px solid #00C9A7',
    animation: 'spin 0.8s linear infinite',
    margin: 'auto'
  }} />
);

const AdminSupport = ({ user }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, open, resolved
  
  const [replyText, setReplyText] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);

  // Admin email check
  const isAdmin = user?.email === "rajesh.professional817@gmail.com";

  useEffect(() => {
    if (isAdmin) {
      loadTickets();
    }
  }, [isAdmin]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await getAllTickets();
      // Sort by newest first
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (ticketId) => {
    try {
      await updateTicketStatus(ticketId, 'resolved');
      setTickets(tickets.map(t => t.ticketId === ticketId ? { ...t, status: 'resolved' } : t));
    } catch (err) {
      console.error(err);
      alert('Failed to update ticket status');
    }
  };

  const handleReplySubmit = async (ticketId) => {
    const text = replyText[ticketId];
    if (!text || text.trim() === '') return;
    
    try {
      await replyToTicket(ticketId, text);
      setTickets(tickets.map(t => t.ticketId === ticketId ? { ...t, reply: text, status: 'resolved' } : t));
      setReplyingTo(null);
    } catch (err) {
      console.error(err);
      alert('Failed to send reply');
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>You do not have permission to view this page.</p>
      </div>
    );
  }

  const filteredTickets = tickets.filter(t => filter === 'all' ? true : t.status === filter);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Admin Support Tickets</h2>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter('all')}
            style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
          >
            All
          </button>
          <button 
            className={`btn ${filter === 'open' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter('open')}
            style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
          >
            Open
          </button>
          <button 
            className={`btn ${filter === 'resolved' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter('resolved')}
            style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
          >
            Resolved
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem 0', display: 'flex', justifyContent: 'center' }}>
          <SpinnerInline size={40} />
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No tickets found for this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {filteredTickets.map(ticket => (
            <div key={ticket.ticketId} className="card" style={{ 
              borderLeft: `4px solid ${ticket.status === 'open' ? '#f59e0b' : 'var(--success)'}` 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{ticket.category}</h3>
                    <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 'bold' }}>{ticket.ticketId}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <span>👤 {ticket.name}</span>
                    <span>✉️ {ticket.email}</span>
                    <span>📅 {new Date(ticket.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
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
                  
                  {ticket.status === 'open' && replyingTo !== ticket.ticketId && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                        onClick={() => setReplyingTo(ticket.ticketId)}
                      >
                        Reply
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', borderColor: 'var(--success)', color: 'var(--success)' }}
                        onClick={() => handleResolve(ticket.ticketId)}
                      >
                        Mark Resolved
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ 
                background: 'var(--bg)', 
                padding: '1rem', 
                borderRadius: 'var(--r-sm)',
                border: '1px solid var(--border)',
                whiteSpace: 'pre-wrap',
                fontSize: '0.95rem',
                color: 'var(--text-primary)',
                marginBottom: '1rem'
              }}>
                <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>USER MESSAGE:</strong>
                {ticket.message}
              </div>

              {ticket.reply && (
                <div style={{ 
                  background: isDark ? 'rgba(0, 201, 167, 0.1)' : 'rgba(0, 201, 167, 0.05)', 
                  padding: '1rem', 
                  borderRadius: 'var(--r-sm)',
                  borderLeft: '4px solid var(--primary)',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)'
                }}>
                  <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--primary)' }}>ADMIN REPLY:</strong>
                  {ticket.reply}
                </div>
              )}

              {replyingTo === ticket.ticketId && (
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <textarea 
                    rows={4} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', resize: 'vertical' }}
                    placeholder="Type your reply here..."
                    value={replyText[ticket.ticketId] || ''}
                    onChange={(e) => setReplyText({ ...replyText, [ticket.ticketId]: e.target.value })}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline" style={{ padding: '0.4rem 1rem' }} onClick={() => setReplyingTo(null)}>Cancel</button>
                    <button className="btn btn-primary" style={{ padding: '0.4rem 1rem' }} onClick={() => handleReplySubmit(ticket.ticketId)}>Send Reply & Resolve</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSupport;
