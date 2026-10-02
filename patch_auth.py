import re

with open('src/firebase/authFunctions.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Add import
code = code.replace(
    'import { createUser, getUser, updateUserProfile, deleteUserData } from "./dbFunctions";',
    'import { createUser, getUser, updateUserProfile, deleteUserData, generateUniqueFinSmartId } from "./dbFunctions";'
)

# Fix signUpWithEmail
old_signup = '''    // Create the user document in Firestore
    await createUser(user.uid, {
      name,
      email,
      photo: user.photoURL || "",
      walletBalance: 0,
      currency: "USD", // Default currency
      createdAt: new Date().toISOString()
    });'''

new_signup = '''    // Generate FinSmart ID
    const finsmartId = await generateUniqueFinSmartId(user.uid, name, email);
    
    // Create the user document in Firestore
    await createUser(user.uid, {
      name,
      email,
      finsmartId,
      photo: user.photoURL || "",
      walletBalance: 0,
      finCoins: 0,
      currency: "USD", // Default currency
      createdAt: new Date().toISOString()
    });'''
code = code.replace(old_signup, new_signup)

# Fix loginWithGoogle
old_google = '''      await createUser(user.uid, {
        name: user.displayName || 'User',
        email: user.email,
        photo: user.photoURL || '',
        walletBalance: 0,
        currency: 'INR',
        createdAt: new Date().toISOString(),
      });
    }
  } catch (firestoreError) {'''

new_google = '''      const finsmartId = await generateUniqueFinSmartId(user.uid, user.displayName || 'User', user.email);
      await createUser(user.uid, {
        name: user.displayName || 'User',
        email: user.email,
        finsmartId,
        photo: user.photoURL || '',
        walletBalance: 0,
        finCoins: 0,
        currency: 'INR',
        createdAt: new Date().toISOString(),
      });
    } else if (!userDoc.finsmartId) {
      // Retrospective ID generation for existing users
      const finsmartId = await generateUniqueFinSmartId(user.uid, userDoc.name || 'User', userDoc.email);
      await updateUserProfile(user.uid, { finsmartId });
    }
  } catch (firestoreError) {'''
code = code.replace(old_google, new_google)

# Fix loginWithEmail (retroactive ID generation)
old_login = '''    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;'''

new_login = '''    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getUser(userCredential.user.uid);
    if (userDoc && !userDoc.finsmartId) {
      const finsmartId = await generateUniqueFinSmartId(userCredential.user.uid, userDoc.name || 'User', userDoc.email);
      await updateUserProfile(userCredential.user.uid, { finsmartId });
    }
    return userCredential.user;'''
code = code.replace(old_login, new_login)


with open('src/firebase/authFunctions.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("authFunctions updated")
