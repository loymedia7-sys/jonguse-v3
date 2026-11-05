import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  Auth,
  User,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';

const firebaseConfig = {
  projectId: firebaseConfigJson.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0555011935',
  authDomain: firebaseConfigJson.authDomain || `${firebaseConfigJson.projectId}.firebaseapp.com`,
  storageBucket: firebaseConfigJson.storageBucket || `${firebaseConfigJson.projectId}.firebasestorage.app`,
  apiKey: firebaseConfigJson.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  appId: firebaseConfigJson.appId,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const FALLBACK_USER_STORAGE_KEY = 'jonguse_fallback_auth_user_v1';
type AuthCallback = (user: User | null) => void;
const authListeners = new Set<AuthCallback>();

function getStoredFallbackUser(): User | null {
  try {
    const raw = localStorage.getItem(FALLBACK_USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.uid) return null;
    return parsed as User;
  } catch {
    return null;
  }
}

function setStoredFallbackUser(userObj: Partial<User> | null): User | null {
  try {
    if (!userObj) {
      localStorage.removeItem(FALLBACK_USER_STORAGE_KEY);
      return null;
    }
    localStorage.setItem(FALLBACK_USER_STORAGE_KEY, JSON.stringify(userObj));
    return userObj as User;
  } catch {
    return (userObj as User) || null;
  }
}

function notifyAuthListeners(user: User | null) {
  authListeners.forEach((cb) => {
    try {
      cb(user);
    } catch {
      // ignore listener errors
    }
  });
}

export function isFirebaseAuthenticated(user?: User | null): boolean {
  const targetUid = user?.uid;
  if (!auth?.currentUser) return false;
  return targetUid ? auth.currentUser.uid === targetUid : true;
}

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  if (firebaseConfigJson.firestoreDatabaseId) {
    db = getFirestore(app, firebaseConfigJson.firestoreDatabaseId);
  } else {
    db = getFirestore(app);
  }
} catch (e) {
  console.warn('Firebase initialization note:', e);
}

export { app, auth, db };

// Save user profile to Firestore only when authenticated with Firebase Auth
async function syncUserProfile(user: User) {
  if (!db || !isFirebaseAuthenticated(user)) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || (user.isAnonymous ? 'Guest User' : 'Creator'),
        photoURL: user.photoURL || '',
        isAnonymous: user.isAnonymous,
        lastActiveAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not sync user document to Firestore:', err);
  }
}

export async function loginWithGoogle(): Promise<User | null> {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      setStoredFallbackUser(null);
      await syncUserProfile(result.user);
      notifyAuthListeners(result.user);
      return result.user;
    }
    return null;
  } catch (err: any) {
    if (err?.code === 'auth/unauthorized-domain') {
      err.unauthorizedDomain =
        typeof window !== 'undefined' ? window.location.hostname : '';
    }
    throw err;
  }
}

export async function loginWithLocalCreator(
  email: string,
  displayName?: string
): Promise<User> {
  const cleanEmail = email.trim().toLowerCase() || 'creator@jonguse.app';
  const cleanName =
    (displayName || '').trim() ||
    cleanEmail.split('@')[0].replace(/[._-]+/g, ' ') ||
    'Creator';
  const uid =
    'local_' +
    cleanEmail.replace(/[^a-z0-9]/g, '_').slice(0, 32);

  const fallbackUser: Partial<User> = {
    uid,
    email: cleanEmail,
    displayName: cleanName,
    photoURL: '',
    emailVerified: true,
    isAnonymous: false,
  };

  const saved = setStoredFallbackUser(fallbackUser)!;
  notifyAuthListeners(saved);
  return saved;
}

export async function logoutUser(): Promise<void> {
  setStoredFallbackUser(null);
  if (auth?.currentUser) {
    await signOut(auth);
  }
  notifyAuthListeners(null);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  authListeners.add(callback);

  if (!auth) {
    callback(getStoredFallbackUser());
    return () => {
      authListeners.delete(callback);
    };
  }

  const unsubscribeFirebase = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      syncUserProfile(firebaseUser);
      callback(firebaseUser);
    } else {
      callback(getStoredFallbackUser());
    }
  });

  return () => {
    authListeners.delete(callback);
    unsubscribeFirebase();
  };
}

export async function ensureAnonymousAuth(): Promise<User | null> {
  if (auth?.currentUser) {
    return auth.currentUser;
  }
  const existingFallback = getStoredFallbackUser();
  if (existingFallback) {
    return existingFallback;
  }
  // Do not call signInAnonymously(auth) to avoid 400 (auth/admin-restricted-operation)
  // when Anonymous Auth provider is disabled in Firebase Console.
  return null;
}



