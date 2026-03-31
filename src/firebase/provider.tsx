'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { Auth, User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { User as AppUser } from '@/lib/types';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Internal state for user authentication
interface UserAuthState {
  user: FirebaseUser | null;
  appUser: AppUser | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  // User authentication state
  user: FirebaseUser | null;
  appUser: AppUser | null;
  isUserLoading: boolean; // True during initial auth check
  userError: Error | null; // Error from auth listener
  signOut: () => Promise<void>;
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: FirebaseUser | null;
  appUser: AppUser | null;
  isUserLoading: boolean;
  userError: Error | null;
  signOut: () => Promise<void>;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult {
  user: FirebaseUser | null;
  appUser: AppUser | null;
  isUserLoading: boolean;
  userError: Error | null;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    appUser: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
  });

  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    if (!auth || !firestore) { // If no Auth/Firestore service instance, cannot determine user state
      setUserAuthState({ user: null, appUser: null, isUserLoading: false, userError: new Error("Auth/Firestore service not provided.") });
      return;
    }

    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (firebaseUser) => { // Auth state determined
        if (firebaseUser) {
          // Listen for user document changes in Firestore
          const userDocRef = doc(firestore, 'users', firebaseUser.uid);
          
          unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              setUserAuthState({
                user: firebaseUser,
                appUser: docSnap.data() as AppUser,
                isUserLoading: false,
                userError: null,
              });
            } else {
              // User document might not exist yet (e.g., during signup)
              setUserAuthState({
                user: firebaseUser,
                appUser: null,
                isUserLoading: false,
                userError: null,
              });
            }
          }, (error) => {
            console.error("FirebaseProvider: onSnapshot error:", error);
            setUserAuthState(prev => ({ ...prev, userError: error, isUserLoading: false }));
          });
        } else {
          if (unsubscribeUserDoc) unsubscribeUserDoc();
          setUserAuthState({ user: null, appUser: null, isUserLoading: false, userError: null });
        }
      },
      (error) => { // Auth listener error
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, appUser: null, isUserLoading: false, userError: error });
      }
    );

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, [auth, firestore]); // Depends on the auth and firestore instances

  const signOut = async () => {
    if (auth) await firebaseSignOut(auth);
  };

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      appUser: userAuthState.appUser,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
      signOut,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    appUser: context.appUser,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
    signOut: context.signOut,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
  return useMemo(factory, deps);
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => {
  const { user, appUser, isUserLoading, userError, signOut } = useFirebase();
  return { 
    user, 
    appUser, 
    isUserLoading, 
    userError,
    isAdmin: appUser?.role === 'admin',
    signOut
  };
};
