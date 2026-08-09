import { useState, useEffect } from 'react';
import './OfflineBanner.css';

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="offline-banner">
      <span className="offline-icon">📡</span>
      <span>You're offline. Showing last loaded data.</span>
    </div>
  );
};

export default OfflineBanner;
