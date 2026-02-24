import type { Category } from "./Categories";

export interface Income {
  id: string;
  amount: number;
  category: Category;
  detail: string;
  date: string;
}
