import type { Expense } from "../types/Expense";
import { getAllExpenses } from "../features/expenses";
import { getBudgets, type Budget } from "../features/budgets";
import { categories } from "../types/Categories";

export const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);

  return date.toLocaleString("es-EC", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const formatDateShort = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString("es-EC", {
    month: "short",
    day: "numeric",
  });
};

export const formatDateRelative = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Hoy, ${date.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}`;
  } else if (diffDays === 1) {
    return `Ayer, ${date.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}`;
  } else if (diffDays < 7) {
    return date.toLocaleDateString("es-EC", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  } else {
    return formatDateShort(isoString);
  }
};

export const getCurrentMonthExpenses = (): Expense[] => {
  const expenses = getAllExpenses();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return expenses.filter(e => new Date(e.date) >= monthStart);
};

export const getCurrentMonthTotal = (): number => {
  return getCurrentMonthExpenses().reduce((sum, e) => sum + e.amount, 0);
};

export const getTotalExpenses = (): number => {
  return getAllExpenses().reduce((sum, e) => sum + e.amount, 0);
};

export const getExpensesCount = (): number => {
  return getAllExpenses().length;
};

export const getBudgetLeft = (): number => {
  const budgets = getBudgets();
  const expenses = getCurrentMonthExpenses();
  
  const totalBudget = budgets
    .filter((b: Budget) => b.period === "monthly")
    .reduce((sum: number, b: Budget) => sum + b.amount, 0);
  
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  return totalBudget - totalSpent;
};

export const getTotalBudget = (): number => {
  const budgets = getBudgets();
  return budgets
    .filter((b: Budget) => b.period === "monthly")
    .reduce((sum, b) => sum + b.amount, 0);
};

export interface CategoryStats {
  category: string;
  label: string;
  amount: number;
  percentage: number;
  color: string;
}

export const getCategoryDistribution = (): CategoryStats[] => {
  const expenses = getCurrentMonthExpenses();
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  if (total === 0) return [];

  const byCategory: Record<string, number> = {};
  expenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });

  return Object.entries(byCategory)
    .map(([cat, amount]) => ({
      category: cat,
      label: categories[cat as keyof typeof categories]?.label || cat,
      amount,
      percentage: (amount / total) * 100,
      color: categories[cat as keyof typeof categories]?.color || "#666",
    }))
    .sort((a, b) => b.amount - a.amount);
};
