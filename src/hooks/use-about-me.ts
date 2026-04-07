'use client';

import { useCallback } from 'react';
import { useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { MentorDoProfile, Medication } from '@/lib/types';

/** Remove campos undefined e o campo 'id' em objetos rasos */
function sanitize<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([k, v]) => k !== 'id' && v !== undefined)
  ) as Partial<T>;
}

/** Sanitiza um medicamento removendo campos opcionais undefined */
function sanitizeMedication(med: Medication): Record<string, unknown> {
  const result: Record<string, unknown> = { id: med.id, name: med.name, frequency: med.frequency };
  if (med.dosage) result.dosage = med.dosage;
  if (med.frequencyNote) result.frequencyNote = med.frequencyNote;
  if (med.notes) result.notes = med.notes;
  return result;
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
      const sanitized = [...existing, newMed].map(sanitizeMedication);
      await updateProfile({ medications: sanitized as unknown as Medication[] });
    },
    [profile, updateProfile]
  );

  const removeMedication = useCallback(
    async (medId: string) => {
      const existing = profile?.medications ?? [];
      const sanitized = existing
        .filter((m) => m.id !== medId)
        .map(sanitizeMedication);
      await updateProfile({ medications: sanitized as unknown as Medication[] });
    },
    [profile, updateProfile]
  );

  return { profile, isLoading, updateProfile, addMedication, removeMedication };
}
