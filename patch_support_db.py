import re

with open('src/firebase/dbFunctions.js', 'r', encoding='utf-8') as f:
    code = f.read()

new_funcs = """
// ==========================================
// SUPPORT TICKETS
// ==========================================

export const createSupportTicket = async (userId, name, email, category, message) => {
  const ticketId = `SUP-${Math.floor(100000 + Math.random() * 900000)}`;
  const ticketRef = doc(db, 'support', ticketId);
  await setDoc(ticketRef, {
    ticketId,
    userId,
    name,
    email,
    category,
    message,
    status: 'open',
    reply: '',
    createdAt: new Date().toISOString()
  });
  return ticketId;
};

export const getUserTickets = async (userId) => {
  const q = query(collection(db, 'support'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const replyToTicket = async (ticketId, replyMessage) => {
  const ticketRef = doc(db, 'support', ticketId);
  await updateDoc(ticketRef, {
    reply: replyMessage,
    status: 'resolved',
    resolvedAt: new Date().toISOString()
  });
};
"""

if 'createSupportTicket' not in code:
    code += '\n' + new_funcs

with open('src/firebase/dbFunctions.js', 'w', encoding='utf-8') as f:
    f.write(code)

print('Added support functions')
