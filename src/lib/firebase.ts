import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: appletConfig.apiKey || "mock-api-key",
  authDomain: appletConfig.authDomain || "mock-domain.firebaseapp.com",
  projectId: appletConfig.projectId || "mock-project-id",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, appletConfig.firestoreDatabaseId || "(default)");

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/contacts');

let isSigningIn = false;
let cachedAccessToken: string | null = sessionStorage.getItem('mtask_google_access_token') || null;

export const initAuth = (
  onAuthSuccess?: (user: Partial<User>, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  if (firebaseConfig.apiKey === "mock-api-key") {
    // If mock API key, we don't start the listener immediately, we just report failure so it prompts for login
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // Even if cachedAccessToken is missing (e.g. after page reload),
      // the user is still authenticated in Firebase.
      // They just won't have the Google Workspace OAuth token until they re-authenticate or use Apps Script fallback.
      if (!cachedAccessToken && !localStorage.getItem('mtask_auth_bypass')) {
         // If there's no auth token and they didn't bypass, force re-auth
         // Unless they are currently in the middle of signing in!
         if (!isSigningIn) {
            if (onAuthFailure) onAuthFailure();
         }
         return;
      }
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      sessionStorage.removeItem('mtask_google_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: Partial<User>; accessToken: string } | null> => {
  if (firebaseConfig.apiKey === "mock-api-key") {
    // Mock login fallback when Firebase is not configured
    cachedAccessToken = "mock-token";
    sessionStorage.setItem('mtask_google_access_token', cachedAccessToken);
    return { 
      user: { displayName: "Guest User", email: "guest@example.com" } as User,
      accessToken: cachedAccessToken 
    };
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    sessionStorage.setItem('mtask_google_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || sessionStorage.getItem('mtask_google_access_token');
};

export const logout = async () => {
  await firebaseSignOut(auth);
  cachedAccessToken = null;
  sessionStorage.removeItem('mtask_google_access_token');
  localStorage.removeItem('mtask_auth_bypass');
  localStorage.removeItem('mtask_user_email');
};
