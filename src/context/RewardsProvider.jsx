import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseClient';
import confetti from 'canvas-confetti';
import './RewardsProvider.css';

const RewardsContext = createContext();

export const useRewards = () => useContext(RewardsContext);

export const RewardsProvider = ({ children }) => {
  const [totalCoins, setTotalCoins] = useState(0);
  const [coinsEarnedToday, setCoinsEarnedToday] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [isGlowing, setIsGlowing] = useState(false);

  // Listen to total coins in real-time
  useEffect(() => {
    let unsubscribe = () => {};
    
    const setupListener = (user) => {
      if (!user) {
        setTotalCoins(0);
        return;
      }
      const rewardsRef = doc(db, "users", user.uid, "rewards", "data");
      unsubscribe = onSnapshot(rewardsRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          
          // Trigger glow if coins increased
          setTotalCoins(prev => {
            if (data.totalCoins > prev && prev !== 0) {
              setIsGlowing(true);
              setTimeout(() => setIsGlowing(false), 2000);
            }
            return data.totalCoins;
          });
          
          setCoinsEarnedToday(data.coinsEarnedToday || 0);
        }
      });
    };

    const authUnsub = auth.onAuthStateChanged(setupListener);

    return () => {
      authUnsub();
      unsubscribe();
    };
  }, []);

  // Listen for custom fincoin-awarded events
  useEffect(() => {
    const handleCoinAward = (e) => {
      const { amount, reason } = e.detail;
      
      // Add Toast
      const id = Date.now();
      setToasts(prev => [...prev, { id, amount, reason }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
      
      // Fire confetti for large rewards
      if (amount >= 100) {
        fireConfetti();
      }
    };

    window.addEventListener('fincoin-awarded', handleCoinAward);
    return () => window.removeEventListener('fincoin-awarded', handleCoinAward);
  }, []);

  const fireConfetti = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700', '#FFA500']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FFD700', '#FFA500']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <RewardsContext.Provider value={{ totalCoins, coinsEarnedToday, isGlowing }}>
      {children}
      
      {/* Toast Container */}
      <div className="fincoins-toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className="fincoins-toast">
            <span className="fincoins-toast-icon">🪙</span>
            <div className="fincoins-toast-content">
              <strong>+{toast.amount} FinCoins earned!</strong>
              <span>{toast.reason}</span>
            </div>
          </div>
        ))}
      </div>
    </RewardsContext.Provider>
  );
};
