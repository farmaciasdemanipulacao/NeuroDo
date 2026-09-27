import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { setAuthPersistenceReady } from './auth-persistence';

export function initializeFirebase() {
  // Safety: do not initialize Firebase on the server.
  if (typeof window === 'undefined') {
    return {
      firebaseApp: null,
      auth: null,
      firestore: null,
    };
  }

  // Require API key to be present — if missing, skip initialization and
  // let the app handle absence of Firebase services gracefully.
  if (!firebaseConfig?.apiKey) {
    console.warn('[Firebase] NEXT_PUBLIC_FIREBASE_API_KEY não está definida. Pulando inicialização.');
    return {
      firebaseApp: null,
      auth: null,
      firestore: null,
    };
  }

  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    const auth = getAuth(firebaseApp);
    setAuthPersistenceReady(setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('[Firebase] Não foi possível ativar persistência local do login:', error);
    }));
    return {
      firebaseApp,
      auth,
      // experimentalAutoDetectLongPolling evita erros 400 no WebChannel
      // quando a conexão streaming é instável (fix para "transport errored")
      firestore: initializeFirestore(firebaseApp, {
        experimentalAutoDetectLongPolling: true,
      }),
    };
  }

  const app = getApp();
  const auth = getAuth(app);
  setAuthPersistenceReady(setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('[Firebase] Não foi possível ativar persistência local do login:', error);
  }));
  return {
    firebaseApp: app,
    auth,
    firestore: getFirestore(app),
  };
}

export * from './auth-persistence';
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
