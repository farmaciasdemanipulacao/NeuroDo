// IMPORTANT: This file should NOT have the 'use client' directive
import * as admin from 'firebase-admin';

// This function initializes and returns the Firebase Admin SDK.
// It's designed to be a singleton, ensuring it only initializes once.
const getAdminApp = () => {
  // Check if the default app is already initialized
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // If not initialized, create a new app instance.
  // In a Google-managed environment (like Cloud Functions, App Engine, or Firebase Hosting with SSR),
  // the SDK can automatically detect the configuration from environment variables.
  // You don't need to pass a service account key file.
  try {
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.error('Firebase Admin SDK initialization failed:', error);
    throw new Error('Could not initialize Firebase Admin SDK. Ensure the environment is set up correctly.');
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
