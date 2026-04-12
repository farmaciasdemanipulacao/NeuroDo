import { useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useUser } from '@/firebase/provider';
import type { TimesheetEntry } from '@/lib/types';

export function useTimesheets({ taskId }: { taskId?: string } = {}) {
  const { user } = useUser();
  const timesheetQuery = useMemoFirebase(() => {
    if (!user) return null;
    let q = query(collection(user.firestore, 'users', user.uid, 'timesheets'), orderBy('startedAt', 'desc'));
    if (taskId) {
      q = query(collection(user.firestore, 'users', user.uid, 'timesheets'), where('taskId', '==', taskId), orderBy('startedAt', 'desc'));
    }
    return q;
  }, [user, taskId]);
  return useCollection<TimesheetEntry>(timesheetQuery);
}
