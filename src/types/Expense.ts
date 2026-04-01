import type { ExpenseGroup } from "./ExpenseGroups";

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseGroup | `custom_${string}`;
  detail: string;
  date: string;
}
