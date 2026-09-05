import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { auth } from '../firebase/firebaseClient';
import { useTheme } from '../context/ThemeProvider';

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

  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    category: '',
    message: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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

    setLoading(true);

    try {
      // Send Email via EmailJS directly
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || "YOUR_SERVICE_ID";
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "YOUR_TEMPLATE_ID";
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "YOUR_PUBLIC_KEY";

      if (serviceId !== "YOUR_SERVICE_ID") {
        console.log("Using EmailJS Public Key:", publicKey === "YOUR_PUBLIC_KEY" ? "NOT_LOADED" : "LOADED");
        
        await emailjs.send(
          serviceId,
          templateId,
          {
            from_name: formData.name,
            reply_to: formData.email,
            category: formData.category,
            message: formData.message,
          },
          {
            publicKey: publicKey
          }
        );
      } else {
        console.warn("EmailJS credentials not set.");
      }

      setSuccess(true);
      setFormData({ name: '', email: '', category: '', message: '' });

    } catch (err) {
      console.error("Support form submission error:", err);
      // EmailJS errors often have a .text property rather than .message
      const errorMsg = err.text || err.message || JSON.stringify(err) || 'Unknown error';
      setError(`Failed to submit ticket: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div className="card" style={{ padding: '2rem' }}>
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
            <p style={{ color: 'var(--text-secondary)' }}>
              Thank you for reaching out. We've received your request and will reply to your email within 24 hours.
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
      </div>
    </div>
  );
};

export default Support;
