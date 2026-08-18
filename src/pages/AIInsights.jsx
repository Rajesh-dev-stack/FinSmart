import { useState, useEffect, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { auth } from '../firebase/firebaseClient';
import { getTransactions, getBudgets, getUser } from '../firebase/dbFunctions';
import { analyzeSpending, getBudgetAdvice, predictNextMonth, getSavingTips } from '../ai/geminiHelper';
import './AIInsights.css';

const AIInsights = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgetsData] = useState([]);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);

  // AI Results
  const [spendingInsights, setSpendingInsights] = useState(null);
  const [budgetAdvice, setBudgetAdvice] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [savingTips, setSavingTips] = useState(null);

  // Loading States
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [loadingTips, setLoadingTips] = useState(false);

  // Error States
  const [errorInsights, setErrorInsights] = useState(null);
  const [errorAdvice, setErrorAdvice] = useState(null);
  const [errorPredictions, setErrorPredictions] = useState(null);
  const [errorTips, setErrorTips] = useState(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchData(user.uid);
      else setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchData = async (userId) => {
    setLoading(true);
    try {
      const txns = await getTransactions(userId);
      const bdgts = await getBudgets(userId);
      const userDoc = await getUser(userId);
      setTransactions(txns);
      setBudgetsData(bdgts);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      let inc = 0, exp = 0;
      txns.forEach(t => {
        const d = new Date(t.date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          if (t.type === 'income') inc += t.amount;
          else exp += t.amount;
        }
      });
      setIncome(inc);
      setExpense(exp);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Spending patterns for saving tips
  const spendingPatterns = useMemo(() => {
    const patterns = {};
    const now = new Date();
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        patterns[t.category] = (patterns[t.category] || 0) + t.amount;
      }
    });
    return patterns;
  }, [transactions]);

  // Prediction chart data
  const predictionChartData = useMemo(() => {
    if (!predictions) return null;
    const labels = Object.keys(predictions);
    const data = Object.values(predictions);
    return {
      labels,
      datasets: [{
        label: 'Predicted Spending (₹)',
        data,
        backgroundColor: [
          '#065F46', '#10B981', '#34D399', '#6EE7B7',
          '#A7F3D0', '#047857', '#059669', '#0D9488'
        ],
        borderRadius: 6
      }]
    };
  }, [predictions]);

  // Handlers
  const handleAnalyze = async () => {
    if (transactions.length === 0) return setErrorInsights("No transactions to analyze.");
    setLoadingInsights(true);
    setErrorInsights(null);
    try {
      const result = await analyzeSpending(transactions.slice(0, 50));
      setSpendingInsights(result);
    } catch (err) {
      setErrorInsights(err.message || "AI analysis failed. Please check your API key.");
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleBudgetAdvice = async () => {
    setLoadingAdvice(true);
    setErrorAdvice(null);
    try {
      const result = await getBudgetAdvice(income, expense, budgets);
      setBudgetAdvice(result);
    } catch (err) {
      setErrorAdvice(err.message || "Failed to get budget advice. Please try again.");
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handlePredict = async () => {
    if (transactions.length === 0) return setErrorPredictions("Need transaction history for predictions.");
    setLoadingPredictions(true);
    setErrorPredictions(null);
    try {
      const result = await predictNextMonth(transactions.slice(0, 80));
      if (result) {
        setPredictions(result);
      } else {
        setErrorPredictions("Could not parse prediction. Try again.");
      }
    } catch (err) {
      setErrorPredictions(err.message || "Prediction failed. Please try again.");
    } finally {
      setLoadingPredictions(false);
    }
  };

  const handleSavingTips = async () => {
    if (Object.keys(spendingPatterns).length === 0) return setErrorTips("No spending data this month.");
    setLoadingTips(true);
    setErrorTips(null);
    try {
      const result = await getSavingTips(spendingPatterns);
      setSavingTips(result);
    } catch (err) {
      setErrorTips(err.message || "Failed to get saving tips. Please try again.");
    } finally {
      setLoadingTips(false);
    }
  };

  if (loading) return <div className="page"><div className="global-spinner"></div></div>;
  if (!auth?.currentUser) return <div className="page empty-state card"><p>Please log in.</p></div>;

  return (
    <div className="page ai-insights-page">
      <div className="ai-header">
        <p className="ai-subtitle">Powered by Google Gemini — Get personalized, AI-driven financial advice.</p>
      </div>

      <div className="ai-grid">

        {/* 1. Spending Analyzer */}
        <div className="card ai-card">
          <div className="ai-card-header">
            <div className="ai-card-icon purple">📊</div>
            <div>
              <h3>Spending Analyzer</h3>
              <p>AI analyzes your transaction history for patterns.</p>
            </div>
          </div>

          {!spendingInsights && !loadingInsights && (
            <button className="btn btn-primary full-width" onClick={handleAnalyze}>
              ✨ Analyze My Spending
            </button>
          )}

          {loadingInsights && <LoadingSkeleton />}
          {errorInsights && <p className="error-text">{errorInsights}</p>}
          {spendingInsights && (
            <div className="ai-result">
              <div className="ai-result-text">{spendingInsights}</div>
              <button className="btn btn-outline btn-sm mt-3" onClick={handleAnalyze}>🔄 Re-analyze</button>
            </div>
          )}
        </div>

        {/* 2. Budget Advisor */}
        <div className="card ai-card">
          <div className="ai-card-header">
            <div className="ai-card-icon green">💡</div>
            <div>
              <h3>Budget Advisor</h3>
              <p>Personalized tips based on the 50/30/20 rule.</p>
            </div>
          </div>

          {!budgetAdvice && !loadingAdvice && (
            <button className="btn btn-primary full-width" onClick={handleBudgetAdvice}>
              🎯 Get Budget Advice
            </button>
          )}

          {loadingAdvice && <LoadingSkeleton />}
          {errorAdvice && <p className="error-text">{errorAdvice}</p>}
          {budgetAdvice && (
            <div className="ai-result">
              <div className="ai-result-text">{budgetAdvice}</div>
              <button className="btn btn-outline btn-sm mt-3" onClick={handleBudgetAdvice}>🔄 Refresh</button>
            </div>
          )}
        </div>

        {/* 3. Next Month Prediction */}
        <div className="card ai-card span-2">
          <div className="ai-card-header">
            <div className="ai-card-icon blue">🔮</div>
            <div>
              <h3>Next Month Prediction</h3>
              <p>AI predicts your expenses for next month by category.</p>
            </div>
          </div>

          {!predictions && !loadingPredictions && (
            <button className="btn btn-primary full-width" onClick={handlePredict}>
              📈 Predict Next Month
            </button>
          )}

          {loadingPredictions && <LoadingSkeleton />}
          {errorPredictions && <p className="error-text">{errorPredictions}</p>}
          {predictions && predictionChartData && (
            <div className="ai-result">
              <div className="prediction-chart-container">
                <Bar 
                  data={predictionChartData} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, ticks: { callback: (v) => `₹${v}` } }
                    }
                  }} 
                />
              </div>
              <div className="prediction-summary">
                <p><strong>Total Predicted:</strong> ₹{Object.values(predictions).reduce((a, b) => a + b, 0).toFixed(2)}</p>
              </div>
              <button className="btn btn-outline btn-sm mt-3" onClick={handlePredict}>🔄 Re-predict</button>
            </div>
          )}
        </div>

        {/* 4. Saving Tips */}
        <div className="card ai-card span-2">
          <div className="ai-card-header">
            <div className="ai-card-icon orange">💰</div>
            <div>
              <h3>Smart Saving Tips</h3>
              <p>Practical tips tailored to your actual spending habits.</p>
            </div>
          </div>

          {!savingTips && !loadingTips && (
            <button className="btn btn-primary full-width" onClick={handleSavingTips}>
              🪙 Get Saving Tips
            </button>
          )}

          {loadingTips && <LoadingSkeleton />}
          {errorTips && <p className="error-text">{errorTips}</p>}
          {savingTips && (
            <div className="ai-result">
              <div className="ai-result-text">{savingTips}</div>
              <button className="btn btn-outline btn-sm mt-3" onClick={handleSavingTips}>🔄 Refresh Tips</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// Reusable loading skeleton
const LoadingSkeleton = () => (
  <div className="ai-loading">
    <div className="ai-loading-bar"></div>
    <div className="ai-loading-bar short"></div>
    <div className="ai-loading-bar"></div>
    <p className="ai-loading-text">🤖 AI is thinking...</p>
  </div>
);

export default AIInsights;
