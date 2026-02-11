export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
}

export type Category =
  | "Food"
  | "Transport"
  | "Entertainment"
  | "Shopping"
  | "Other";
