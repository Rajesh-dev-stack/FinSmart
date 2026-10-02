import re

with open('src/firebase/dbFunctions.js', 'r', encoding='utf-8') as f:
    code = f.read()

new_funcs = """
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

import { runTransaction, onSnapshot } from 'firebase/firestore';

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
"""

code = code.replace("import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, where, deleteDoc, writeBatch } from 'firebase/firestore';", "import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, where, deleteDoc, writeBatch, runTransaction, onSnapshot } from 'firebase/firestore';")

if 'findUserByFinSmartId' not in code:
    code += '\n' + new_funcs

with open('src/firebase/dbFunctions.js', 'w', encoding='utf-8') as f:
    f.write(code)

print('Patched dbFunctions')
