import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent duplicate initialization in development
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminFirestore = admin.apps.length ? admin.firestore() : null;
