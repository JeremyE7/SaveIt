import type { ExpenseCategory } from "./ExpenseCategories";

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  detail: string;
  date: string;
}
