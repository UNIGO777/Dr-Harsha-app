/**
 * Home screen mocks — ONLY for the parts that have no backend yet.
 *
 * Everything else on the home screen is live (see `@/features/home/useHomeData`):
 * profile, enrollment, today's workout, the level roadmap, the week strip, pain
 * trends and the short-session row all come from the API.
 *
 * Remaining gaps:
 *  1. WALLET — the backend's Subscription model supports TRIAL/DAILY/WEEKLY/
 *     MONTHLY/QUARTERLY plans but has no wallet or ledger. These shapes are
 *     provisional so the prepaid-balance UI can be reviewed before that model is
 *     committed to.
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

/** TODO: replace with GET /wallet once the wallet module exists. */
export const wallet: HomeWallet = {
  balanceInr: 450,
  estimatedDaysRemaining: 12,
  lowBalance: false,
  autoRecharge: true,
  autoRechargeAmount: 500,
};

/** TODO: replace with the consultations module when it lands. */
export const specialist = {
  name: 'Dr. Harsha S.',
  title: 'Spinal Health Specialist',
  avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&q=80',
};
