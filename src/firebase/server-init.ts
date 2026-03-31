import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';


export function getSdks() {
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
     return {
        firebaseApp,
        auth: getAuth(firebaseApp),
        firestore: getFirestore(firebaseApp),
    };
  }

  const app = getApp();
  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app)
  };
}
