import type { Category } from "./Categories";

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  detail: string;
  date: string;
}
