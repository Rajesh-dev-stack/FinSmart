import re

with open('src/firebase/dbFunctions.js', 'r', encoding='utf-8') as f:
    code = f.read()

new_func = """export const getUserByFinSmartId = async (finSmartId) => {
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
"""

if 'getUserByFinSmartId' not in code:
    code += '\n' + new_func

with open('src/firebase/dbFunctions.js', 'w', encoding='utf-8') as f:
    f.write(code)
