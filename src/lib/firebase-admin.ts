import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '../firebase/config';

// Check if the app is already initialized to prevent duplicate initialization in development
if (!getApps().length) {
  try {
    // Attempt to use applicationDefault (requires GOOGLE_APPLICATION_CREDENTIALS env logic
    // or being run in a proper Google Cloud environment).
    const credential = applicationDefault();
    
    initializeApp({
      credential,
      projectId: firebaseConfig.projectId,
    });
    console.log("Firebase Admin Initialized successfully.");
  } catch (error: any) {
    if (error.message && error.message.includes('Could not load the default credentials')) {
        console.warn('⚠️ Firebase Admin: No credentials found. Admin features (like hard-deleting users from Auth) will FAIL in this local environment unless you provide a service account.');
        // We still initialize it with a dummy credential just so the app doesn't crash on boot,
        // but calls to getAuth().deleteUser() will throw 500s.
        initializeApp({ 
            projectId: firebaseConfig.projectId 
        });
    } else {
        console.error('Firebase admin initialization error', error);
    }
  }
}

export const adminAuth = getApps().length ? getAuth() : null;
export const adminFirestore = getApps().length ? getFirestore() : null;
