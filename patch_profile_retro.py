import re

with open('src/pages/Profile.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    "import { getUser } from '../firebase/dbFunctions';",
    "import { getUser, generateUniqueFinSmartId, updateUserProfile } from '../firebase/dbFunctions';"
)

old_effect = """        try {
          const doc = await getUser(u.uid);
          setUserDoc(doc);
        } catch (e) { console.error(e); }"""

new_effect = """        try {
          let doc = await getUser(u.uid);
          if (doc && !doc.finsmartId) {
            const newId = await generateUniqueFinSmartId(u.uid, doc.name || u.displayName || 'User', doc.email || u.email);
            await updateUserProfile(u.uid, { finsmartId: newId });
            doc.finsmartId = newId; // Update locally
          }
          setUserDoc(doc);
        } catch (e) { console.error(e); }"""

code = code.replace(old_effect, new_effect)

with open('src/pages/Profile.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Profile fixed")
