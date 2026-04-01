import type { ExpenseGroup } from "./ExpenseGroups";

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseGroup | `custom_${string}`;
  detail: string;
  date: string;
  source?: 'manual' | 'subscription';
  subscriptionId?: string;
  subscriptionPeriod?: string;
}
