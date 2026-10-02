import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc,
  updateDoc,
  increment,
  runTransaction
} from "firebase/firestore";
import { db } from "./firebaseClient";

// ==========================================
// USERS
// ==========================================
export const createUser = async (userId, userData) => {
  try {
    await setDoc(doc(db, "users", userId), userData);
    clearCache();
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const updateUserProfile = async (userId, data) => {
  try {
    await updateDoc(doc(db, "users", userId), data);
    clearCache();
  } catch (error) {
    console.error("Error updating user: ", error);
    throw error;
  }
};

export const deleteUserData = async (userId) => {
  try {
    const txnsQuery = query(collection(db, "transactions"), where("userId", "==", userId));
    const txnsSnapshot = await getDocs(txnsQuery);
    const txnDeletes = txnsSnapshot.docs.map(d => deleteDoc(d.ref));
    
    const budgetsQuery = collection(db, `budgets/${userId}/categories`);
    const budgetsSnapshot = await getDocs(budgetsQuery);
    const budgetDeletes = budgetsSnapshot.docs.map(d => deleteDoc(d.ref));
    
    await Promise.all([...txnDeletes, ...budgetDeletes]);
    await deleteDoc(doc(db, "users", userId));
    clearCache();
  } catch (error) {
    console.error("Error deleting user data: ", error);
    throw error;
  }
};

export const getUser = async (userId) => {
  try {
    const now = Date.now();
    if (_cache.user.data && _cache.user.userId === userId && now - _cache.user.time < 30000) {
      return _cache.user.data;
    }
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      _cache.user = { userId, data, time: now };
      return data;
    }
    return null;
  } catch (error) {
    console.error("Error getting user:", error);
    throw error;
  }
};

export const getUserByEmail = async (email) => {
  try {
    const q = query(collection(db, "users"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    throw error;
  }
};

export const updateWalletBalance = async (userId, amount) => {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      walletBalance: increment(amount)
    }, { merge: true });
    clearCache();
  } catch (error) {
    console.error("Error updating wallet balance:", error);
    throw error;
  }
};

// ==========================================
// TRANSACTIONS
// ==========================================
let _cache = {
  transactions: { userId: null, data: null, time: 0 },
  budgets: { userId: null, data: null, time: 0 },
  user: { userId: null, data: null, time: 0 }
};

export const clearCache = () => {
  _cache = {
    transactions: { userId: null, data: null, time: 0 },
    budgets: { userId: null, data: null, time: 0 },
    user: { userId: null, data: null, time: 0 }
  };
};

export const addTransaction = async (transactionData) => {
  try {
    const docRef = await addDoc(collection(db, "transactions"), {
      ...transactionData,
      createdAt: new Date().toISOString()
    });
    
    const amountToUpdate = transactionData.type === 'income' ? transactionData.amount : -transactionData.amount;
    await updateWalletBalance(transactionData.userId, amountToUpdate);
    
    if (transactionData.type === 'expense' && transactionData.category) {
      await updateBudgetSpent(transactionData.userId, transactionData.category, transactionData.amount);
    }
    
    // Process FinCoins rewards
    await processTransactionRewards(transactionData.userId, transactionData);
    
    clearCache(); // invalidate cache
    return docRef.id;
  } catch (error) {
    console.error("Error adding transaction:", error);
    throw error;
  }
};

export const getTransactions = async (userId) => {
  try {
    const now = Date.now();
    if (_cache.transactions.data && _cache.transactions.userId === userId && now - _cache.transactions.time < 30000) {
      return _cache.transactions.data;
    }
    const q = query(
      collection(db, "transactions"), 
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const transactions = [];
    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort locally to avoid Firestore Composite Index requirements
    transactions.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    _cache.transactions = { userId, data: transactions, time: now };
    return transactions;
  } catch (error) {
    console.error("Error getting transactions:", error);
    throw error;
  }
};

export const getTransactionsByMonth = async (userId, month, year) => {
  try {
    // Assuming date is stored as "YYYY-MM-DD"
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    
    const q = query(
      collection(db, "transactions"), 
      where("userId", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    const transactions = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.date) {
        let dateStr = data.date;
        if (typeof data.date !== 'string') {
          dateStr = data.date.toDate ? data.date.toDate().toISOString() : String(data.date);
        }
        if (dateStr.startsWith(prefix)) {
          transactions.push({ id: doc.id, ...data, date: dateStr });
        }
      }
    });
    
    // Sort descending by date
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    return transactions;
  } catch (error) {
    console.error("Error getting transactions by month:", error);
    throw error;
  }
};

export const deleteTransaction = async (transactionId, userId, amount, type, category) => {
  try {
    await deleteDoc(doc(db, "transactions", transactionId));
    
    // Reverse the wallet balance impact
    const amountToUpdate = type === 'income' ? -amount : amount;
    if (userId && amount) {
      await updateWalletBalance(userId, amountToUpdate);
    }
    
    // Reverse budget impact if it was an expense
    if (type === 'expense' && category) {
      await updateBudgetSpent(userId, category, -amount);
    }
    clearCache();
  } catch (error) {
    console.error("Error deleting transaction:", error);
    throw error;
  }
};

export const updateTransaction = async (transactionId, oldTxn, newTxn) => {
  try {
    const docRef = doc(db, "transactions", transactionId);
    await updateDoc(docRef, newTxn);
    
    // Adjust wallet balance
    const oldImpact = oldTxn.type === 'income' ? oldTxn.amount : -oldTxn.amount;
    const newImpact = newTxn.type === 'income' ? newTxn.amount : -newTxn.amount;
    const balanceDiff = newImpact - oldImpact;
    if (balanceDiff !== 0) {
      await updateWalletBalance(oldTxn.userId, balanceDiff);
    }

    // Adjust budgets
    if (oldTxn.type === 'expense' && oldTxn.category) {
      await updateBudgetSpent(oldTxn.userId, oldTxn.category, -oldTxn.amount);
    }
    if (newTxn.type === 'expense' && newTxn.category) {
      await updateBudgetSpent(newTxn.userId, newTxn.category, newTxn.amount);
    }
    clearCache();
  } catch (error) {
    console.error("Error updating transaction:", error);
    throw error;
  }
};

// ==========================================
// BUDGETS
// ==========================================
export const setBudget = async (userId, category, limit) => {
  try {
    const budgetRef = doc(db, `budgets/${userId}/categories`, category);
    await setDoc(budgetRef, {
      limit,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear()
    }, { merge: true }); // Use merge to avoid overwriting 'spent' if it exists
    clearCache();
  } catch (error) {
    console.error("Error setting budget:", error);
    throw error;
  }
};

export const getBudgets = async (userId) => {
  try {
    const now = Date.now();
    if (_cache.budgets.data && _cache.budgets.userId === userId && now - _cache.budgets.time < 30000) {
      return _cache.budgets.data;
    }
    const q = query(collection(db, `budgets/${userId}/categories`));
    const querySnapshot = await getDocs(q);
    let budgets = [];
    querySnapshot.forEach((doc) => {
      budgets.push({ category: doc.id, ...doc.data() });
    });

    if (budgets.length === 0) {
      const defaultBudgets = {
        'Food & Canteen': { limit: 2000, spent: 0 },
        'Transport & Auto': { limit: 500, spent: 0 },
        'Shopping': { limit: 1000, spent: 0 },
        'Entertainment': { limit: 500, spent: 0 },
        'Transfer': { limit: 1000, spent: 0 },
        'Others': { limit: 500, spent: 0 }
      };
      
      const promises = Object.entries(defaultBudgets).map(([cat, data]) => {
        const budgetRef = doc(db, `budgets/${userId}/categories`, cat);
        return setDoc(budgetRef, {
          limit: data.limit,
          spent: data.spent,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        });
      });
      await Promise.all(promises);
      
      budgets = Object.entries(defaultBudgets).map(([cat, data]) => ({
        category: cat,
        limit: data.limit,
        spent: data.spent
      }));
    }

    _cache.budgets = { userId, data: budgets, time: now };
    return budgets;
  } catch (error) {
    console.error("Error getting budgets:", error);
    throw error;
  }
};

export const updateBudgetSpent = async (userId, category, amount) => {
  try {
    const budgetRef = doc(db, `budgets/${userId}/categories`, category);
    const docSnap = await getDoc(budgetRef);
    
    if (docSnap.exists()) {
      await updateDoc(budgetRef, {
        spent: increment(amount)
      });
    } else {
      // Create budget category if it doesn't exist
      await setDoc(budgetRef, {
        limit: 1000, // default limit
        spent: amount,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      });
    }
  } catch (error) {
    console.error("Error updating budget spent:", error);
    throw error;
  }
};

// ==========================================
// SAVINGS & INTEREST SYSTEM
// ==========================================

export const transferToSavings = async (userId, amount) => {
  try {
    const docRef = doc(db, "users", userId);
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(docRef);
      if (!userDoc.exists()) throw new Error("User does not exist!");
      const data = userDoc.data();
      const currentWallet = data.walletBalance || 0;
      const currentSavings = data.savings?.balance || 0;
      
      if (currentWallet < amount) {
        throw new Error("Insufficient wallet balance for this transfer.");
      }
      
      const newSavingsBalance = currentSavings + amount;
      
      transaction.update(docRef, {
        walletBalance: currentWallet - amount,
        "savings.balance": newSavingsBalance,
        "savings.lastInterestDate": data.savings?.lastInterestDate || new Date().toISOString(),
        "savings.totalInterestEarned": data.savings?.totalInterestEarned || 0,
        "savings.savingsSince": data.savings?.savingsSince || new Date().toISOString()
      });
    });
    clearCache();
    
    // Evaluate goals after transaction completes
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.savings?.goal && data.savings.balance >= data.savings.goal && !data.savings.goalAchieved) {
          await awardCoins(userId, 150, "Achieved savings goal!");
          await updateDoc(docRef, { "savings.goalAchieved": true });
        }
        // Simplified weekly goal check: If they add amount >= weekly target in one go (or total savings increase)
        if (data.savings?.weeklyTarget && amount >= data.savings.weeklyTarget) {
          await awardCoins(userId, 25, "Completed weekly savings target!");
        }
      }
    } catch(e) { console.error("Error evaluating savings goals:", e); }
    
  } catch (error) {
    console.error("Transfer to savings failed:", error);
    throw error;
  }
};

export const transferFromSavings = async (userId, amount) => {
  try {
    const docRef = doc(db, "users", userId);
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(docRef);
      if (!userDoc.exists()) throw new Error("User does not exist!");
      const data = userDoc.data();
      const currentWallet = data.walletBalance || 0;
      const currentSavings = data.savings?.balance || 0;
      
      if (currentSavings < amount) {
        throw new Error("Insufficient savings balance.");
      }
      
      transaction.update(docRef, {
        walletBalance: currentWallet + amount,
        "savings.balance": currentSavings - amount
      });
    });
    clearCache();
  } catch (error) {
    console.error("Transfer from savings failed:", error);
    throw error;
  }
};

export const processDailyInterest = async (userId) => {
  try {
    const docRef = doc(db, "users", userId);
    let interestCredited = 0;
    
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(docRef);
      if (!userDoc.exists()) return;
      const data = userDoc.data();
      
      if (!data.savings || !data.savings.balance || data.savings.balance <= 0) return;
      
      const balance = data.savings.balance;
      const lastDateStr = data.savings.lastInterestDate;
      if (!lastDateStr) return;
      
      const lastDate = new Date(lastDateStr);
      const now = new Date();
      
      // Calculate days difference (standardize to midnight for strict daily compounding)
      const msPerDay = 1000 * 60 * 60 * 24;
      const lastMidnight = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()).getTime();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      
      const daysPassed = Math.floor((todayMidnight - lastMidnight) / msPerDay);
      
      if (daysPassed <= 0) return; // No days passed yet
      
      // Compound formula: A = P(1 + r/n)^(nt)
      // Here r = 0.06, n = 365, t = daysPassed / 365 => nt = daysPassed
      const r = 0.06;
      const dailyRate = r / 365;
      const newBalance = balance * Math.pow(1 + dailyRate, daysPassed);
      
      interestCredited = newBalance - balance;
      
      if (interestCredited > 0) {
        transaction.update(docRef, {
          "savings.balance": newBalance,
          "savings.lastInterestDate": now.toISOString(),
          "savings.totalInterestEarned": (data.savings.totalInterestEarned || 0) + interestCredited
        });
        
        // Add transaction log
        const txRef = doc(collection(db, "interestTransactions"));
        transaction.set(txRef, {
          userId,
          amount: interestCredited,
          balanceAfter: newBalance,
          daysCalculated: daysPassed,
          date: now.toISOString()
        });
      }
    });
    
    if (interestCredited > 0) {
      clearCache();
    }
    return interestCredited;
  } catch (error) {
    console.error("Daily interest processing failed:", error);
    return 0;
  }
};

export const getInterestTransactions = async (userId) => {
  try {
    const q = query(collection(db, "interestTransactions"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const txns = [];
    snapshot.forEach(doc => txns.push({ id: doc.id, ...doc.data() }));
    return txns.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error("Error fetching interest transactions:", error);
    return [];
  }
};

// ==========================================
// REWARDS & FINCOINS
// ==========================================

export const getRewardData = async (userId) => {
  try {
    const docRef = doc(db, "users", userId, "rewards", "data");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    const initialData = {
      totalCoins: 0,
      coinsEarnedToday: 0,
      streakDays: 0,
      lastEarnedDate: null,
      lastTransactionDate: null
    };
    await setDoc(docRef, initialData);
    return initialData;
  } catch (error) {
    console.error("Error getting rewards data:", error);
    return null;
  }
};

export const awardCoins = async (userId, amount, reason) => {
  try {
    const rewardsRef = doc(db, "users", userId, "rewards", "data");
    const today = new Date().toISOString().split('T')[0];
    
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(rewardsRef);
      if (!docSnap.exists()) {
        transaction.set(rewardsRef, {
          totalCoins: amount,
          coinsEarnedToday: amount,
          streakDays: 0,
          lastEarnedDate: today,
          lastTransactionDate: null
        });
      } else {
        const data = docSnap.data();
        let earnedToday = data.coinsEarnedToday || 0;
        if (data.lastEarnedDate !== today) {
          earnedToday = 0;
        }
        transaction.update(rewardsRef, {
          totalCoins: increment(amount),
          coinsEarnedToday: earnedToday + amount,
          lastEarnedDate: today
        });
      }
      
      const txRef = doc(collection(db, "coinTransactions"));
      transaction.set(txRef, {
        userId,
        amount,
        reason,
        date: new Date().toISOString(),
        type: 'earned'
      });
    });

    // Dispatch global event for toast & confetti
    window.dispatchEvent(new CustomEvent('fincoin-awarded', { 
      detail: { amount, reason }
    }));
  } catch (error) {
    console.error("Error awarding coins:", error);
  }
};

export const redeemReward = async (userId, cost, rewardName) => {
  try {
    const rewardsRef = doc(db, "users", userId, "rewards", "data");
    let success = false;
    
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(rewardsRef);
      if (!docSnap.exists()) throw new Error("Reward data not found");
      const data = docSnap.data();
      
      if (data.totalCoins < cost) {
        throw new Error("Insufficient FinCoins");
      }
      
      transaction.update(rewardsRef, {
        totalCoins: increment(-cost)
      });
      
      const txRef = doc(collection(db, "coinTransactions"));
      transaction.set(txRef, {
        userId,
        amount: cost,
        reason: rewardName,
        date: new Date().toISOString(),
        type: 'redeemed'
      });
      
      success = true;
    });
    
    return success;
  } catch (error) {
    console.error("Error redeeming reward:", error);
    throw error;
  }
};

export const getCoinTransactions = async (userId) => {
  try {
    const q = query(collection(db, "coinTransactions"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const txns = [];
    snapshot.forEach(doc => txns.push({ id: doc.id, ...doc.data() }));
    return txns.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error("Error fetching coin transactions:", error);
    return [];
  }
};

export const processTransactionRewards = async (userId, transactionData) => {
  try {
    const rewardsRef = doc(db, "users", userId, "rewards", "data");
    const docSnap = await getDoc(rewardsRef);
    let data = docSnap.exists() ? docSnap.data() : { streakDays: 0, lastTransactionDate: null, totalCoins: 0 };
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const lastTxStr = data.lastTransactionDate;
    
    if (!lastTxStr && data.totalCoins === 0) {
      await awardCoins(userId, 20, "First transaction ever");
    }

    let newStreak = data.streakDays || 0;
    
    if (lastTxStr) {
      const lastDate = new Date(lastTxStr);
      // Simplify logic by checking the date string difference loosely
      const timeDiff = Math.abs(today.setHours(0,0,0,0) - lastDate.setHours(0,0,0,0));
      const diffDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); 
      
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }
    
    if (lastTxStr !== todayStr && transactionData.type === 'expense') {
      await awardCoins(userId, 10, "Daily expense log");
    }
    
    // Every transaction gets +10 coins
    await awardCoins(userId, 10, "Transaction bonus");

    if (newStreak === 7 && data.streakDays !== 7) {
      await awardCoins(userId, 75, "7 Day Streak");
    } else if (newStreak === 30 && data.streakDays !== 30) {
      await awardCoins(userId, 300, "30 Day Streak");
    }

    await setDoc(rewardsRef, {
      streakDays: newStreak,
      lastTransactionDate: todayStr
    }, { merge: true });

  } catch (error) {
    console.error("Error processing transaction rewards:", error);
  }
};

// ==========================================
// PAYEES
// ==========================================
export const addPayee = async (userId, payeeData) => {
  try {
    const docRef = await addDoc(collection(db, `users/${userId}/payees`), {
      ...payeeData,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding payee:", error);
    throw error;
  }
};

export const getPayees = async (userId) => {
  try {
    const q = query(collection(db, `users/${userId}/payees`));
    const snapshot = await getDocs(q);
    const payees = [];
    snapshot.forEach(doc => payees.push({ id: doc.id, ...doc.data() }));
    // Sort descending by creation date so newest is first
    return payees.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error("Error getting payees:", error);
    return [];
  }
};

export const deletePayee = async (userId, payeeId) => {
  try {
    await deleteDoc(doc(db, `users/${userId}/payees`, payeeId));
  } catch (error) {
    console.error("Error deleting payee:", error);
    throw error;
  }
};


export const setSavingsGoal = async (userId, goal, weeklyTarget) => {
  try {
    const docRef = doc(db, "users", userId);
    await updateDoc(docRef, {
      "savings.goal": goal,
      "savings.weeklyTarget": weeklyTarget,
      "savings.goalAchieved": false
    });
  } catch(error) {
    console.error("Error setting savings goal:", error);
    throw error;
  }
};

export const evaluateMonthlyRewards = async (userId) => {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${now.getMonth() + 1}`;
    
    const lastEvalMonth = data.lastMonthlyRewardEval || null;
    
    if (lastEvalMonth !== currentMonthStr) {
      // It's a new month! Let's check last month's performance.
      // We will assume they stayed in budget if they have ANY FinCoins (as a mock/simplified check)
      // or we can fetch their budgets.
      
      const budgets = await getBudgets(userId);
      let stayedInBudget = true;
      if (budgets && budgets.length > 0) {
        for (let b of budgets) {
          if (b.spent > b.limit) {
            stayedInBudget = false;
            break;
          }
        }
      } else {
        stayedInBudget = false; // no budgets = no reward
      }
      
      if (stayedInBudget && budgets.length > 0) {
        await awardCoins(userId, 50, "Stayed within monthly budget!");
      }
      
      // Save more than last month check
      const currentSavings = data.savings?.balance || 0;
      const lastMonthSavings = data.lastMonthSavingsBalance || 0;
      
      if (currentSavings > lastMonthSavings && currentSavings > 0) {
        await awardCoins(userId, 100, "Saved more than last month!");
      }
      
      // Update for next month
      await updateDoc(docRef, {
        lastMonthlyRewardEval: currentMonthStr,
        lastMonthSavingsBalance: currentSavings
      });
    }
  } catch(e) {
    console.error("Error evaluating monthly rewards:", e);
  }
};

// ==========================================
// SUPPORT TICKETS
// ==========================================
export const submitSupportTicket = async (ticketData) => {
  try {
    await setDoc(doc(db, "support", ticketData.ticketId), ticketData);
  } catch (error) {
    console.error("Error submitting support ticket:", error);
    throw error;
  }
};

export const getAllTickets = async () => {
  try {
    const q = query(collection(db, "support"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Error fetching all tickets:", error);
    throw error;
  }
};

export const updateTicketStatus = async (ticketId, status) => {
  try {
    await updateDoc(doc(db, "support", ticketId), { status });
  } catch (error) {
    console.error("Error updating ticket status:", error);
    throw error;
  }
};

export const getUserTickets = async (userId) => {
  try {
    const q = query(collection(db, "support"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    throw error;
  }
};


// ==========================================
// FINSMART IDs
// ==========================================
export const generateUniqueFinSmartId = async (userId, name, email) => {
  let isUnique = false;
  let id = "";
  const year = new Date().getFullYear();
  
  while (!isUnique) {
    const random = Math.floor(100000 + Math.random() * 900000);
    id = `FIN${year}${random}`;
    
    const docRef = doc(db, "finsmartIds", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      isUnique = true;
    }
  }
  
  await setDoc(doc(db, "finsmartIds", id), {
    userId,
    name,
    email
  });
  
  return id;
};

export const getUserByFinSmartId = async (finSmartId) => {
  try {
    const docRef = doc(db, "finsmartIds", finSmartId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (e) {
    console.error("Error looking up FinSmart ID:", e);
    return null;
  }
};


// ==========================================
// REAL-TIME MONEY TRANSFER & WALLET
// ==========================================

export const findUserByFinSmartId = async (finsmartId) => {
  if (!finsmartId || !finsmartId.startsWith('FIN') || finsmartId.length !== 13) {
    throw new Error('❌ FinSmart ID must be 13 characters starting with FIN');
  }
  const docRef = doc(db, 'finsmartIds', finsmartId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error('❌ FinSmart ID not found!');
  }
  return docSnap.data(); // { userId, name, email }
};



export const sendMoneyByFinSmartId = async (senderUID, receiverFinSmartId, amount, note) => {
  const amountNum = Number(amount);
  if (amountNum <= 0) throw new Error('❌ Cannot send 0 or negative amount');

  await runTransaction(db, async (transaction) => {
    // 1. Get Sender doc
    const senderRef = doc(db, 'users', senderUID);
    const senderSnap = await transaction.get(senderRef);
    if (!senderSnap.exists()) throw new Error('❌ Sender not found');
    
    // 2. Lookup Receiver FinSmart ID
    const finsmartRef = doc(db, 'finsmartIds', receiverFinSmartId);
    const finsmartSnap = await transaction.get(finsmartRef);
    if (!finsmartSnap.exists()) throw new Error('❌ FinSmart ID not found!');
    
    const receiverData = finsmartSnap.data();
    if (receiverData.userId === senderUID) {
      throw new Error('❌ Cannot send money to yourself!');
    }
    
    // 3. Get Receiver doc
    const receiverRef = doc(db, 'users', receiverData.userId);
    const receiverSnap = await transaction.get(receiverRef);
    if (!receiverSnap.exists()) throw new Error('❌ Receiver account not found');
    
    const senderData = senderSnap.data();
    
    // 4. Check balance
    if (senderData.walletBalance < amountNum) {
      throw new Error('❌ Insufficient balance!');
    }
    
    // 5. Deduct from Sender
    transaction.update(senderRef, {
      walletBalance: senderData.walletBalance - amountNum
    });
    
    // 6. Credit to Receiver
    transaction.update(receiverRef, {
      walletBalance: receiverSnap.data().walletBalance + amountNum
    });
    
    // 7. Save Transaction for Sender
    const senderTxnRef = doc(collection(db, 'transactions'));
    transaction.set(senderTxnRef, {
      userId: senderUID,
      type: 'expense',
      category: 'Money Sent',
      amount: amountNum,
      description: `Sent to ${receiverData.name}`,
      receiverFinSmartId: receiverFinSmartId,
      note: note || '',
      date: new Date().toISOString()
    });
    
    // 8. Save Transaction for Receiver
    const receiverTxnRef = doc(collection(db, 'transactions'));
    transaction.set(receiverTxnRef, {
      userId: receiverData.userId,
      type: 'income',
      category: 'Money Received',
      amount: amountNum,
      description: `Received from ${senderData.name}`,
      senderFinSmartId: senderData.finsmartId || '',
      note: note || '',
      date: new Date().toISOString()
    });
  });

  // Award FinCoins after transaction succeeds
  try {
    await awardCoins(senderUID, 5, 'Secure transfer completed');
  } catch (e) {}
  
  // Return receiver name for success message
  const finsmartSnap = await getDoc(doc(db, 'finsmartIds', receiverFinSmartId));
  return finsmartSnap.data().name;
};

export const listenToWalletBalance = (userId, callback) => {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().walletBalance || 0);
    }
  });
};


export const replyToTicket = async (ticketId, replyMessage) => {
  const ticketRef = doc(db, 'support', ticketId);
  await updateDoc(ticketRef, {
    reply: replyMessage,
    status: 'resolved',
    resolvedAt: new Date().toISOString()
  });
};


export const listenForNewTransactions = (userId, callback) => {
  const q = query(collection(db, 'transactions'), where('userId', '==', userId));
  let isInitialLoad = true;
  
  return onSnapshot(q, (snapshot) => {
    if (isInitialLoad) {
      isInitialLoad = false;
      return;
    }
    
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        callback(change.doc.data());
      }
    });
  });
};
