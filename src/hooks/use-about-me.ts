'use client';

import { useCallback } from 'react';
import { useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { MentorDoProfile, Medication } from '@/lib/types';

/** Remove campos undefined e o campo 'id' antes de salvar no Firestore */
function sanitize<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([k, v]) => k !== 'id' && v !== undefined)
  ) as Partial<T>;
}

/**
 * Lê e escreve o perfil pessoal do usuário (Sobre Mim / MentorDo)
 * em /users/{uid}/profile/mentordo
 */
export function useAboutMe() {
  const { user } = useUser();
  const firestore = useFirestore();

  const profileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'profile', 'mentordo');
  }, [user, firestore]);

  const { data: profile, isLoading } = useDoc<MentorDoProfile>(profileRef);

  const updateProfile = useCallback(
    async (updates: Partial<MentorDoProfile>) => {
      if (!user || !firestore) return;
      const ref = doc(firestore, 'users', user.uid, 'profile', 'mentordo');
      await setDoc(
        ref,
        {
          ...sanitize(profile ?? {}),
          ...sanitize(updates),
          userId: user.uid,
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );
    },
    [user, firestore, profile]
  );

  const addMedication = useCallback(
    async (med: Omit<Medication, 'id'>) => {
      const newMed: Medication = {
        ...med,
        id: `med_${Date.now()}`,
      };
      const existing = profile?.medications ?? [];
      await updateProfile({ medications: [...existing, newMed] });
    },
    [profile, updateProfile]
  );

  const removeMedication = useCallback(
    async (medId: string) => {
      const existing = profile?.medications ?? [];
      await updateProfile({ medications: existing.filter((m) => m.id !== medId) });
    },
    [profile, updateProfile]
  );

  return { profile, isLoading, updateProfile, addMedication, removeMedication };
}
