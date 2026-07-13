import { Schema, model, type Types } from 'mongoose';
import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUSES,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from '../constants/enums';

/**
 * Subscription = a user's app-access plan (trial/recurring).
 * NOTE: consultation bookings and their payments are a SEPARATE concern handled
 * by the payments module later — they are intentionally NOT modeled here.
 */
export interface IRazorpayInfo {
  orderId?: string;
  paymentId?: string;
  signature?: string;
}

export interface IReceipt {
  receiptId: string;
  amountInr: number;
  date: Date;
  url?: string;
}

export interface ISubscription {
  user: Types.ObjectId;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate?: Date;
  endDate?: Date;
  autoRenew: boolean;
  razorpay: IRazorpayInfo;
  receipts: IReceipt[];

  createdAt: Date;
  updatedAt: Date;
}

const razorpayInfoSchema = new Schema<IRazorpayInfo>(
  {
    orderId: { type: String },
    paymentId: { type: String },
    signature: { type: String },
  },
  { _id: false }
);

const receiptSchema = new Schema<IReceipt>(
  {
    receiptId: { type: String, required: true },
    amountInr: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    url: { type: String },
  },
  { _id: false }
);

const subscriptionSchema = new Schema<ISubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: { type: String, enum: SUBSCRIPTION_PLANS, required: true },
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      required: true,
      index: true,
    },
    startDate: { type: Date },
    endDate: { type: Date },
    autoRenew: { type: Boolean, default: false },
    razorpay: { type: razorpayInfoSchema, default: () => ({}) },
    receipts: { type: [receiptSchema], default: [] },
  },
  { timestamps: true }
);

export const Subscription = model<ISubscription>(
  'Subscription',
  subscriptionSchema
);
