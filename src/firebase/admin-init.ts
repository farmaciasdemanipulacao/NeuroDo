// IMPORTANT: This file should NOT have the 'use client' directive
import * as admin from 'firebase-admin';

// This function initializes and returns the Firebase Admin SDK.
// It's designed to be a singleton, ensuring it only initializes once.
const getAdminApp = () => {
  // Check if the default app is already initialized
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error);
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY é inválido. Verifique o JSON configurado nas variáveis de ambiente.');
    }
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  } catch (error) {
    console.error('Firebase Admin SDK initialization failed:', error);
    throw new Error('Could not initialize Firebase Admin SDK. Ensure FIREBASE_SERVICE_ACCOUNT_KEY is configured or application default credentials are available.');
  }
};

// Returns an initialized Firestore instance from the Admin SDK.
export const getAdminFirestore = () => {
  return getAdminApp().firestore();
};

// Returns an initialized Auth instance from the Admin SDK.
export const getAdminAuth = () => {
  return getAdminApp().auth();
};
