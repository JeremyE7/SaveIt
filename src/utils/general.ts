import type { Expense } from "../types/Expense";
import type { Income } from "../types/Income";
import { getAllExpenses } from "../features/expenses";
import { getAllIncomes } from "../features/incomes";
import { getBudgets, type Budget } from "../features/budgets";
import { expenseGroups, type ExpenseGroup } from "../types/ExpenseGroups";

const pad2 = (value: number): string => value.toString().padStart(2, '0');

type DateParts = {
  year: number;
  month: number;
  day: number;
};

const parseStoredDateParts = (dateValue: string): DateParts | null => {
  const normalizedMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (normalizedMatch) {
    return {
      year: Number(normalizedMatch[1]),
      month: Number(normalizedMatch[2]) - 1,
      day: Number(normalizedMatch[3]),
    };
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;

  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth(),
    day: parsed.getUTCDate(),
  };
};

export const toInputDateValue = (dateValue: string): string => {
  const parts = parseStoredDateParts(dateValue);
  if (!parts) return '';

  return `${parts.year}-${pad2(parts.month + 1)}-${pad2(parts.day)}`;
};

export const getTodayLocalInputDateValue = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
};

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
  return expenseGroups[category as ExpenseGroup]?.label || category;
};

const getExpenseCategoryColor = (category: string): string => {
  if (category.startsWith('custom_')) {
    const categoryId = category.replace('custom_', '');
    const customCategories = getCustomCategories();
    const customCat = customCategories.find(c => c.id === categoryId && c.type === 'expense');
    if (customCat) return customCat.color;
  }
  return expenseGroups[category as ExpenseGroup]?.color || '#666';
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
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  return expenses.filter((e) => {
    const parts = parseStoredDateParts(e.date);
    return parts ? parts.year === currentYear && parts.month === currentMonth : false;
  });
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
    .reduce((sum: number, b: Budget) => sum + b.amount, 0);
  
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  return totalBudget - totalSpent;
};

export const getTotalBudget = (): number => {
  const budgets = getBudgets();
  return budgets
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
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  return incomes.filter((i) => {
    const parts = parseStoredDateParts(i.date);
    return parts ? parts.year === currentYear && parts.month === currentMonth : false;
  });
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

  return expenses.filter((e) => {
    const parts = parseStoredDateParts(e.date);
    return parts ? parts.year === year && parts.month === month : false;
  });
};

export const getIncomesByMonth = (year: number, month: number): Income[] => {
  const incomes = getAllIncomes();

  return incomes.filter((i) => {
    const parts = parseStoredDateParts(i.date);
    return parts ? parts.year === year && parts.month === month : false;
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
