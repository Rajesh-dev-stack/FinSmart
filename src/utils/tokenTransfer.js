import { 
  runTransaction, doc, 
  setDoc, deleteDoc, getDocs,
  onSnapshot, collection,
  query, where, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseClient';

// Generate secure random token
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'FST-';
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }
  return token;
}

// STEP 1: Sender initiates transfer
export async function initiateTransfer(
  sender, receiver, amount, note
) {
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60000);

  await setDoc(doc(db, 'transferTokens', token), {
    token,
    senderId: sender.uid,
    senderName: sender.name,
    senderFinSmartId: sender.finsmartId,
    receiverId: receiver.uid,
    receiverFinSmartId: receiver.finsmartId,
    amount,
    note: note || '',
    status: 'pending',
    createdAt: serverTimestamp(),
    expiresAt: expiresAt
  });

  return token;
}

// STEP 2: Auto redeem token (receiver side)
export async function redeemToken(token) {
  const tokenRef = doc(db, 'transferTokens', token);

  await runTransaction(db, async (transaction) => {
    const tokenDoc = await transaction.get(tokenRef);

    if (!tokenDoc.exists()) {
      throw new Error('❌ Invalid token!');
    }

    const data = tokenDoc.data();

    // Check if expired
    const now = new Date();
    const expiresAt = data.expiresAt.toDate();
    if (now > expiresAt) {
      transaction.delete(tokenRef); // delete in transaction instead of await deleteDoc
      throw new Error('❌ Token expired!');
    }

    // Check if already redeemed
    if (data.status === 'redeemed') {
      throw new Error('❌ Token already used!');
    }

    const senderRef = doc(db, 'users', data.senderId);
    const receiverRef = doc(db, 'users', data.receiverId);

    const senderDoc = await transaction.get(senderRef);
    const receiverDoc = await transaction.get(receiverRef);

    if (!senderDoc.exists() || !receiverDoc.exists()) {
       throw new Error('❌ Invalid sender or receiver!');
    }

    // Check sender balance
    if (senderDoc.data().walletBalance < data.amount) {
      throw new Error('❌ Insufficient balance!');
    }

    // Transfer money atomically
    transaction.update(senderRef, {
      walletBalance: 
        senderDoc.data().walletBalance - data.amount
    });

    transaction.update(receiverRef, {
      walletBalance: 
        receiverDoc.data().walletBalance + data.amount
    });

    // Save transaction for sender
    transaction.set(
      doc(db, 'transactions', `${token}-send`), {
        userId: data.senderId,
        type: 'expense',
        category: 'Money Sent',
        amount: data.amount,
        description: `Sent to ${data.receiverFinSmartId}`,
        note: data.note,
        token: token,
        date: new Date().toISOString()
      }
    );

    // Save transaction for receiver
    transaction.set(
      doc(db, 'transactions', `${token}-recv`), {
        userId: data.receiverId,
        type: 'income',
        category: 'Money Received',
        amount: data.amount,
        description: `Received from ${data.senderFinSmartId}`,
        note: data.note,
        token: token,
        date: new Date().toISOString()
      }
    );

    // Mark token as redeemed
    transaction.update(tokenRef, {
      status: 'redeemed',
      redeemedAt: serverTimestamp()
    });
  });

  // Delete token after redemption
  await deleteDoc(tokenRef);
}

// STEP 3: Auto listen for incoming tokens
export function listenForIncomingTransfer(
  userId, onReceived
) {
  const q = query(
    collection(db, 'transferTokens'),
    where('receiverId', '==', userId),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, async (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        const token = data.token;

        try {
          // Auto redeem immediately!
          await redeemToken(token);
          
          // Notify receiver
          onReceived({
            amount: data.amount,
            from: data.senderName,
            finsmartId: data.senderFinSmartId
          });
        } catch (error) {
          console.error('Auto redeem failed:', error);
        }
      }
    });
  });
}

// STEP 4: Auto expire old tokens
export async function cleanExpiredTokens(userId) {
  const now = new Date();
  const q = query(
    collection(db, 'transferTokens'),
    where('senderId', '==', userId),
    where('status', '==', 'pending'),
    where('expiresAt', '<', now)
  );
  
  try {
    const snapshot = await getDocs(q);
    snapshot.forEach(async (d) => {
      await deleteDoc(d.ref);
    });
  } catch (e) {
    console.error("cleanExpiredTokens failed", e);
  }
}
