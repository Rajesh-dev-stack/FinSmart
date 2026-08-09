import { useState, useEffect } from 'react';
import './InstallPrompt.css';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed previously (within last 7 days)
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedAt = new Date(dismissed);
      const daysSince = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }

    // Detect iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIos(isIosDevice);

    // Listen for the beforeinstallprompt event (Android / Desktop Chrome)
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Show the banner after 30 seconds
    const timer = setTimeout(() => {
      if (isIosDevice || deferredPrompt) {
        setShowBanner(true);
      }
    }, 30000);

    // Also show if prompt fires before 30s
    const earlyCheck = setTimeout(() => {
      setShowBanner(true);
    }, 30000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
      clearTimeout(earlyCheck);
    };
  }, [deferredPrompt]);

  // Re-check: show banner when deferredPrompt becomes available after 30s
  useEffect(() => {
    if (deferredPrompt && !isInstalled) {
      const timer = setTimeout(() => setShowBanner(true), 30000);
      return () => clearTimeout(timer);
    }
  }, [deferredPrompt, isInstalled]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  if (!showBanner || isInstalled) return null;

  return (
    <div className="install-banner">
      <div className="install-content">
        <div className="install-icon">📱</div>
        <div className="install-text">
          {isIos ? (
            <>
              <strong>Install FinSmart</strong>
              <p>Tap <span className="ios-share">⬆</span> then <strong>"Add to Home Screen"</strong></p>
            </>
          ) : (
            <>
              <strong>Install FinSmart</strong>
              <p>Add to your home screen for quick access</p>
            </>
          )}
        </div>
        <div className="install-actions">
          {!isIos && (
            <button className="install-btn" onClick={handleInstall}>Install</button>
          )}
          <button className="dismiss-btn" onClick={handleDismiss}>✕</button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
