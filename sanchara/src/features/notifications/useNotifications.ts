/**
 * Notifications — DERIVED, not stored.
 *
 * There is no notifications module on the server (push.service.ts is still a
 * stub), so rather than render a fake inbox this builds the feed from state the
 * app already holds: today's plan, the active session, entitlement, pain trends,
 * wallet balance. Every item is therefore true at the moment it is shown and
 * links somewhere real — no invented history, no timestamps we can't stand
 * behind.
 *
 * The queries here are the same ones home/progress already use, so this costs
 * no extra network calls; React Query serves them from cache.
 *
 * When a real notifications backend lands, replace this hook with a query
 * against it — the screen renders whatever list it is given.
 */
import { useMemo } from 'react';

import { useMe } from '@/features/auth/api';
import { useMyEnrollment, useToday } from '@/features/enrollments/api';
import { useActiveSession, useTrends } from '@/features/sessions/api';
import { LOW_BALANCE_INR, useWalletStore } from '@/store/walletStore';

export type NoticeTone = 'action' | 'info' | 'warning';

export interface Notice {
  id: string;
  tone: NoticeTone;
  /** lucide icon name, resolved by the screen. */
  icon: 'play' | 'moon' | 'check' | 'shield' | 'wallet' | 'trend' | 'trophy';
  title: string;
  body: string;
  /** Route to open when tapped. Omit for informational-only items. */
  href?: string;
  cta?: string;
}

/** Whole days until an ISO date, or null. */
function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

export function useNotifications() {
  const me = useMe();
  const enrollment = useMyEnrollment();
  const today = useToday(!!enrollment.data);
  const active = useActiveSession();
  const trends = useTrends();
  const balance = useWalletStore((s) => s.balanceInr);

  const notices = useMemo<Notice[]>(() => {
    const out: Notice[] = [];
    const user = me.data;
    const plan = enrollment.data;
    const day = today.data;
    const resuming = active.data?.active === true;

    // ── Entitlement — the only thing that can stop the app working ───────────
    if (user && !user.entitled) {
      out.push({
        id: 'no-access',
        tone: 'warning',
        icon: 'shield',
        title: 'Your access has ended',
        body: 'Top up your wallet to carry on with your programme.',
        href: '/(app)/(tabs)/wallet',
        cta: 'Open wallet',
      });
    } else {
      const trialLeft = daysUntil(user?.trialEndDate);
      if (trialLeft !== null && trialLeft <= 3) {
        out.push({
          id: 'trial-ending',
          tone: 'warning',
          icon: 'shield',
          title:
            trialLeft === 0
              ? 'Your trial ends today'
              : `Your trial ends in ${trialLeft} day${trialLeft === 1 ? '' : 's'}`,
          body: 'Add money to your wallet to keep your sessions running.',
          href: '/(app)/(tabs)/wallet',
          cta: 'Open wallet',
        });
      }
    }

    // ── Today ────────────────────────────────────────────────────────────────
    if (resuming) {
      out.push({
        id: 'resume',
        tone: 'action',
        icon: 'play',
        title: 'You have a session in progress',
        body: 'Pick up where you left off — your place is saved.',
        href: '/(session)/player',
        cta: 'Resume',
      });
    } else if (plan && day?.locked) {
      out.push({
        id: 'day-done',
        tone: 'info',
        icon: 'check',
        title: "Today's session is done",
        body: 'Your next day opens tomorrow. Rest is part of the programme.',
      });
    } else if (plan && day?.isRestDay) {
      out.push({
        id: 'rest-day',
        tone: 'info',
        icon: 'moon',
        title: 'Today is a rest day',
        body: 'Nothing to do but recover. Mark it done from your plan.',
        href: '/(app)/(tabs)/home',
        cta: 'Open plan',
      });
    } else if (plan && day?.hasContent) {
      out.push({
        id: 'session-ready',
        tone: 'action',
        icon: 'play',
        title: day.title ? `${day.title} is ready` : "Today's session is ready",
        body: `${day.exercises.length} exercise${day.exercises.length === 1 ? '' : 's'} waiting${
          day.levelNumber ? ` · Level ${day.levelNumber}, day ${day.dayNumber}` : ''
        }.`,
        href: '/(app)/(tabs)/home',
        cta: 'Start',
      });
    } else if (!plan) {
      out.push({
        id: 'no-program',
        tone: 'action',
        icon: 'play',
        title: 'Choose your programme',
        body: 'Pick a programme and your daily plan starts straight away.',
        href: '/(programs)',
        cta: 'Browse',
      });
    }

    // ── Level milestone ──────────────────────────────────────────────────────
    const levelsDone = plan?.completedLevels?.length ?? 0;
    if (levelsDone > 0) {
      out.push({
        id: `level-${levelsDone}`,
        tone: 'info',
        icon: 'trophy',
        title: `Level ${levelsDone} complete`,
        body: `You're on level ${plan?.currentLevel}. That's real progress.`,
        href: '/(app)/(tabs)/progress',
        cta: 'See progress',
      });
    }

    // ── Pain moving the wrong way — worth a clinician's eyes ─────────────────
    const worsening = Object.entries(trends.data?.painByArea ?? {})
      .map(([area, points]) => ({
        area,
        first: points[0]?.score ?? 0,
        last: points[points.length - 1]?.score ?? 0,
        n: points.length,
      }))
      .filter((a) => a.n >= 3 && a.last > a.first)
      .sort((a, b) => b.last - b.first - (a.last - a.first))[0];

    if (worsening) {
      out.push({
        id: `pain-${worsening.area}`,
        tone: 'warning',
        icon: 'trend',
        title: `${worsening.area} pain is trending up`,
        body: `It's gone from ${worsening.first} to ${worsening.last} out of 10. Consider booking a consultation.`,
        href: '/(app)/(tabs)/progress',
        cta: 'See the trend',
      });
    }

    // ── Wallet ───────────────────────────────────────────────────────────────
    if (balance <= LOW_BALANCE_INR) {
      out.push({
        id: 'low-balance',
        tone: 'warning',
        icon: 'wallet',
        title: 'Wallet running low',
        body: `₹${balance} left. Top up so your sessions aren't interrupted.`,
        href: '/(app)/(tabs)/wallet',
        cta: 'Top up',
      });
    }

    return out;
  }, [me.data, enrollment.data, today.data, active.data, trends.data, balance]);

  return {
    notices,
    /** Anything the patient should act on — drives the header bell's dot. */
    actionableCount: notices.filter((n) => n.tone !== 'info').length,
    isPending: me.isPending || enrollment.isPending,
    isRefreshing:
      me.isFetching || enrollment.isFetching || today.isFetching || trends.isFetching,
    refetch: () => {
      void me.refetch();
      void enrollment.refetch();
      void today.refetch();
      void active.refetch();
      void trends.refetch();
    },
  };
}
