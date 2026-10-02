import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  deleteUser
} from "firebase/auth";
import { auth, googleProvider } from "./firebaseClient";
import { createUser, getUser, updateUserProfile, deleteUserData, generateUniqueFinSmartId } from "./dbFunctions";

export const signUpWithEmail = async (email, password, name) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update the profile with the user's name
    await updateProfile(user, { displayName: name });
    
    // Generate FinSmart ID
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
    });
    
    return user;
  } catch (error) {
    console.error("Error in signUpWithEmail:", error);
    throw error;
  }
};

export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getUser(userCredential.user.uid);
    if (userDoc && !userDoc.finsmartId) {
      const finsmartId = await generateUniqueFinSmartId(userCredential.user.uid, userDoc.name || 'User', userDoc.email);
      await updateUserProfile(userCredential.user.uid, { finsmartId });
    }
    return userCredential.user;
  } catch (error) {
    console.error("Error in loginWithEmail:", error);
    throw error;
  }
};

export const loginWithGoogle = async () => {
  // Step 1: Google Auth (this is the critical step)
  const userCredential = await signInWithPopup(auth, googleProvider);
  const user = userCredential.user;

  // Step 2: Firestore setup — non-blocking.
  // If Firestore is offline this won't block the login.
  try {
    const userDoc = await getUser(user.uid);
    if (!userDoc) {
      const finsmartId = await generateUniqueFinSmartId(user.uid, user.displayName || 'User', user.email);
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
  } catch (firestoreError) {
    // Firestore offline or permission error — log it but don't block login
    console.warn('Firestore setup skipped (offline or permission issue):', firestoreError.message);
  }

  return user;
};


export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error in logoutUser:", error);
    throw error;
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Error in resetPassword:", error);
    throw error;
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const updateAuthProfile = async (displayName, photoURL) => {
  try {
    const user = auth.currentUser;
    if (user) {
      await updateProfile(user, { displayName, photoURL });
      await updateUserProfile(user.uid, { name: displayName, photo: photoURL });
      return user;
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

export const deleteUserAccount = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      const uid = user.uid;
      // 1. Delete all Firestore data
      await deleteUserData(uid);
      // 2. Delete Auth account
      await deleteUser(user);
    }
  } catch (error) {
    console.error("Error deleting account:", error);
    throw error;
  }
};
