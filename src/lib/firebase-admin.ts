import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Check if the app is already initialized to prevent duplicate initialization in development
if (!getApps().length) {
  try {
    initializeApp({
      credential: applicationDefault()
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const adminAuth = getApps().length ? getAuth() : null;
export const adminFirestore = getApps().length ? getFirestore() : null;
