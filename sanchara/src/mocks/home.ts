/**
 * Home screen mocks — ONLY for the parts that have no backend yet.
 *
 * Everything else on the home screen is live (see `@/features/home/useHomeData`):
 * profile, enrollment, today's workout, the level roadmap, the week strip, pain
 * trends and the short-session row all come from the API.
 *
 * Remaining gaps:
 *  1. WALLET — the backend's Subscription model supports TRIAL/DAILY/WEEKLY/
 *     MONTHLY/QUARTERLY plans but has no wallet or ledger. Only the SHAPE lives
 *     here now; the provisional values moved to src/store/walletStore.ts so the
 *     home card and the Wallet tab read one source.
 *  2. SPECIALIST — consultation booking isn't built yet, so the clinician card
 *     is static.
 */

export interface HomeWallet {
  balanceInr: number;
  estimatedDaysRemaining: number;
  lowBalance: boolean;
  autoRecharge: boolean;
  autoRechargeAmount: number;
}

/**
 * The clinician behind the programme. Static until the consultations module
 * lands — only the booking ACTION needs a backend, not who is on the card.
 *
 * The portrait is a bundled asset (not a URL), so it renders instantly and
 * offline; `require` hands expo-image a local module id.
 */
export const specialist = {
  name: 'Dr. Harsha KJ',
  title: 'Lifestyle & Prevention Centre',
  avatar: require('../../assets/images/dr-harsha.png') as number,
};
