'use client';

import { useEffect, useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useSharedTasks } from '@/context/dashboard-data-provider';
import { usePreferences } from '@/hooks/use-preferences';
import { useToast } from '@/hooks/use-toast';
import type { Delegation, Task } from '@/lib/types';

const REMINDER_PREFIX = 'neurodo:reminder:';
const CHECK_INTERVAL_MS = 60_000;

function localDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function minutesSinceMidnight(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

function parseTime(value?: string) {
  if (!value) return null;

  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function dateValueToLocalKey(value: string | { toDate: () => Date } | undefined) {
  if (!value) return null;

  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : localDateKey(parsed);
  }

  try {
    return localDateKey(value.toDate());
  } catch {
    return null;
  }
}

function wasShown(key: string) {
  try {
    return localStorage.getItem(`${REMINDER_PREFIX}${key}`) === '1';
  } catch {
    return false;
  }
}

function markShown(key: string) {
  try {
    localStorage.setItem(`${REMINDER_PREFIX}${key}`, '1');
  } catch {
    // O lembrete continua funcionando nesta sessão mesmo se o storage estiver indisponível.
  }
}

async function showSystemNotification(
  key: string,
  title: string,
  body: string,
  url: string
) {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted' ||
    !('serviceWorker' in navigator)
  ) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification(title, {
      body,
      icon: '/logo-neurodo-quadrada.png',
      badge: '/logo-neurodo-favicon.png',
      tag: key,
      data: { url },
    });

    return true;
  } catch (error) {
    console.warn('[NeuroDO Reminders] Falha ao exibir notificação do sistema:', error);
    return false;
  }
}

export function NotificationManager() {
  const { preferences } = usePreferences();
  const enabled = preferences?.notificationsEnabled === true;
  const { data: tasks } = useSharedTasks();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const delegationsQuery = useMemoFirebase(() => {
    if (!enabled || !user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'delegations'));
  }, [enabled, user, firestore]);

  const { data: delegations } = useCollection<Delegation>(delegationsQuery);

  const pendingTasks = useMemo(
    () => (tasks ?? []).filter((task) => !task.completed),
    [tasks]
  );

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const registerServiceWorker = async () => {
      if (!('serviceWorker' in navigator)) return;

      try {
        await navigator.serviceWorker.register('/neurodo-sw.js', {
          scope: '/',
        });
      } catch (error) {
        console.warn('[NeuroDO Reminders] Falha ao registrar service worker:', error);
      }
    };

    const notify = async (
      key: string,
      title: string,
      body: string,
      url: string
    ) => {
      if (cancelled || wasShown(key)) return;

      markShown(key);

      const systemShown = await showSystemNotification(key, title, body, url);

      if (!systemShown && !cancelled) {
        toast({
          title,
          description: body,
          duration: 8000,
        });
      }
    };

    const checkReminders = async () => {
      if (cancelled) return;

      const now = new Date();
      const today = localDateKey(now);
      const nowMinutes = minutesSinceMidnight(now);

      const overdueTasks = pendingTasks.filter(
        (task) => task.scheduledDate && task.scheduledDate < today
      );

      if (nowMinutes >= 8 * 60 && overdueTasks.length > 0) {
        await notify(
          `overdue:${today}`,
          'Pendências pedindo atenção',
          `${overdueTasks.length} tarefa${overdueTasks.length === 1 ? '' : 's'} atrasada${overdueTasks.length === 1 ? '' : 's'}. Abra o Plano do Dia e escolha o próximo passo.`,
          '/dashboard/plan'
        );
      }

      const todayTasks = pendingTasks.filter(
        (task) => task.scheduledDate === today
      );

      const mit = todayTasks.find((task) => task.isMIT);
      if (nowMinutes >= 8 * 60 && mit) {
        await notify(
          `mit:${today}:${mit.id}`,
          'Sua prioridade de hoje',
          mit.content,
          '/dashboard/plan'
        );
      }

      for (const task of todayTasks) {
        const scheduledMinutes = parseTime(task.specificTime);
        if (scheduledMinutes === null) continue;

        const minutesLate = nowMinutes - scheduledMinutes;

        if (minutesLate >= 0 && minutesLate <= 60) {
          await notify(
            `task:${today}:${task.id}`,
            task.isMIT ? 'MIT agora' : 'Hora da tarefa',
            task.content,
            '/dashboard/plan'
          );
        }
      }

      const dueDelegations = (delegations ?? []).filter((delegation) => {
        if (delegation.status === 'Concluída') return false;

        const dueToday = dateValueToLocalKey(delegation.dueDate) === today;
        const followUpToday = (delegation.followUpDates ?? []).some(
          (date) => dateValueToLocalKey(date) === today
        );

        return dueToday || followUpToday;
      });

      if (nowMinutes >= 9 * 60 && dueDelegations.length > 0) {
        await notify(
          `delegations:${today}`,
          'Follow-up de delegações',
          `${dueDelegations.length} delegação${dueDelegations.length === 1 ? '' : 'ões'} precisa${dueDelegations.length === 1 ? '' : 'm'} de atenção hoje.`,
          '/dashboard/delegations'
        );
      }

      if (nowMinutes >= 19 * 60) {
        await notify(
          `nightly-review:${today}`,
          'Feche o dia com clareza',
          'Faça sua Revisão Noturna e deixe as prioridades de amanhã preparadas.',
          '/dashboard/review'
        );
      }
    };

    registerServiceWorker().then(checkReminders);
    interval = setInterval(checkReminders, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [delegations, enabled, pendingTasks, toast]);

  return null;
}
