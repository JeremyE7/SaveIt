import type { Expense } from "../types/Expense";
import type { Income } from "../types/Income";
import { getAllExpenses } from "../features/expenses";
import { getAllIncomes } from "../features/incomes";
import { getBudgets, type Budget } from "../features/budgets";
import { expenseCategories, type ExpenseCategory } from "../types/ExpenseCategories";

const getCustomCategories = (): Array<{id: string; name: string; icon: string; color: string; type: 'expense' | 'income'}> => {
  return JSON.parse(localStorage.getItem('customCategories') || '[]');
};

const getExpenseCategoryLabel = (category: string): string => {
  if (category.startsWith('custom_')) {
    const categoryId = category.replace('custom_', '');
    const customCategories = getCustomCategories();
    const customCat = customCategories.find(c => c.id === categoryId && c.type === 'expense');
    if (customCat) return customCat.name;
  }
  return expenseCategories[category as ExpenseCategory]?.label || category;
};

const getExpenseCategoryColor = (category: string): string => {
  if (category.startsWith('custom_')) {
    const categoryId = category.replace('custom_', '');
    const customCategories = getCustomCategories();
    const customCat = customCategories.find(c => c.id === categoryId && c.type === 'expense');
    if (customCat) return customCat.color;
  }
  return expenseCategories[category as ExpenseCategory]?.color || '#666';
};

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
      label: getExpenseCategoryLabel(cat),
      amount,
      percentage: (amount / total) * 100,
      color: getExpenseCategoryColor(cat),
    }))
    .sort((a, b) => b.amount - a.amount);
};

export const getCurrentMonthIncomes = (): Income[] => {
  const incomes = getAllIncomes();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return incomes.filter(e => new Date(e.date) >= monthStart);
};

export const getCurrentMonthIncomeTotal = (): number => {
  return getCurrentMonthIncomes().reduce((sum, e) => sum + e.amount, 0);
};

export const getBalance = (): number => {
  const incomes = getCurrentMonthIncomeTotal();
  const expenses = getCurrentMonthTotal();
  return incomes - expenses;
};

export const getExpensesByMonth = (year: number, month: number): Expense[] => {
  const expenses = getAllExpenses();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  return expenses.filter(e => {
    const date = new Date(e.date);
    return date >= monthStart && date <= monthEnd;
  });
};

export const getIncomesByMonth = (year: number, month: number): Income[] => {
  const incomes = getAllIncomes();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  return incomes.filter(i => {
    const date = new Date(i.date);
    return date >= monthStart && date <= monthEnd;
  });
};

export const getMonthTotal = (year: number, month: number): number => {
  return getExpensesByMonth(year, month).reduce((sum, e) => sum + e.amount, 0);
};

export const getIncomeMonthTotal = (year: number, month: number): number => {
  return getIncomesByMonth(year, month).reduce((sum, i) => sum + i.amount, 0);
};

export const getAllExpensesTotal = (): number => {
  return getAllExpenses().reduce((sum, e) => sum + e.amount, 0);
};

export const getAllIncomesTotal = (): number => {
  return getAllIncomes().reduce((sum, i) => sum + i.amount, 0);
};
