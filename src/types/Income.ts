import type { IncomeCategory } from "./IncomeCategories";

export interface Income {
  id: string;
  amount: number;
  category: IncomeCategory;
  detail: string;
  date: string;
}
