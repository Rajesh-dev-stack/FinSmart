import re

with open('src/firebase/dbFunctions.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_func = """
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
"""

if 'generateUniqueFinSmartId' not in content:
    with open('src/firebase/dbFunctions.js', 'w', encoding='utf-8') as f:
        f.write(content + '\n' + new_func)

print("dbFunctions updated")
