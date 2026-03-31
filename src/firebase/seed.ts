import { Firestore, doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { UserRole } from '@/lib/types';

/**
 * Seeds initial data for a new user in Firestore.
 * This includes the user profile and any initial configuration or data.
 */
export async function seedNewUserData(
  firestore: Firestore,
  userId: string,
  email: string | null,
  displayName: string | null,
  photoURL: string | null,
  role: UserRole = 'user'
) {
  const userDocRef = doc(firestore, 'users', userId);
  
  // 1. Create the main user document
  await setDoc(userDocRef, {
    id: userId,
    email,
    displayName,
    photoURL,
    role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // 2. Create initial subcollections or documents if needed
  // For example, an initial energy checkin or a welcome message
  
  // Example: Initial PDI (Personal Development Interface) entry
  const pdiRef = doc(collection(userDocRef, 'pdi_history'));
  await setDoc(pdiRef, {
    userId,
    content: "Bem-vindo ao NeuroDO! Este é o seu espaço para crescimento e foco.",
    createdAt: serverTimestamp(),
    type: 'welcome'
  });

  // Example: Initial Questionnaire entry (if applicable)
  // const questionnaireRef = doc(collection(userDocRef, 'profile_questionnaires'));
  // await setDoc(questionnaireRef, { ... });

  console.log(`Data seeded for user: ${userId}`);
}

/**
 * Seeds admin-specific data or configurations.
 */
export async function seedAdminData(firestore: Firestore, adminId: string) {
  // Add admin-specific logic here
  console.log(`Admin data seeded for user: ${adminId}`);
}
