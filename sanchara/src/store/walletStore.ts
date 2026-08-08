/**
 * Wallet — PROVISIONAL client state.
 *
 * There is no wallet on the server yet: the backend's Subscription model covers
 * TRIAL/DAILY/WEEKLY/MONTHLY/QUARTERLY plans but has no balance or ledger. This
 * store exists so the prepaid-balance UI can be built and reviewed against a
 * single source of truth — the home card and the Wallet tab read the same
 * numbers instead of each holding their own copy and drifting.
 *
 * Nothing here touches money. `topUp` is not wired to a payment provider and is
 * never called from the checkout flow; the UI says plainly that payments aren't
 * live. When the wallet module lands, replace this store with React Query reads
 * of GET /wallet + the ledger and delete the seed below.
 */
import { create } from 'zustand';

export interface WalletTransaction {
  id: string;
  kind: 'credit' | 'debit';
  amountInr: number;
  label: string;
  /** ISO date. */
  at: string;
}

/** Balance at or below this shows the low-balance nudge. */
export const LOW_BALANCE_INR = 200;

/** Provisional: what a day of access is assumed to cost. */
export const DAILY_RATE_INR = 35;

interface WalletState {
  balanceInr: number;
  autoRecharge: boolean;
  autoRechargeAmount: number;
  transactions: WalletTransaction[];
  setAutoRecharge: (on: boolean) => void;
  setAutoRechargeAmount: (amount: number) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  // Seed values — stand-ins for GET /wallet, not a real balance.
  balanceInr: 450,
  autoRecharge: true,
  autoRechargeAmount: 500,
  transactions: [],

  setAutoRecharge: (autoRecharge) => set({ autoRecharge }),
  setAutoRechargeAmount: (autoRechargeAmount) => set({ autoRechargeAmount }),
}));

/** Roughly how long the balance lasts at the assumed daily rate. */
export function daysRemaining(balanceInr: number): number {
  return Math.max(0, Math.floor(balanceInr / DAILY_RATE_INR));
}
