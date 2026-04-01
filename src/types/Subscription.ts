import type { ExpenseGroup } from "./ExpenseGroups";

export type SubscriptionStatus = 'active' | 'cancelled';

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  category: ExpenseGroup;
  billingDay: number;
  startDate: string;
  status: SubscriptionStatus;
  notifyEnabled: boolean;
  notifyDaysBefore: number;
  createdAt: string;
  updatedAt: string;
}
