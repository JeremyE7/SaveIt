import type { ExpenseGroup } from "../types/ExpenseGroups";

export interface Budget {
  category: ExpenseGroup;
  amount: number;
}

export interface BudgetAlert {
  category: ExpenseGroup;
  spent: number;
  budget: number;
  percentage: number;
}

export const BUDGETS_KEY = 'budgets';

export const getBudgets = (): Budget[] => {
  const data = localStorage.getItem(BUDGETS_KEY);
  return data ? JSON.parse(data) : [];
};

export const setBudgets = (budgets: Budget[]): void => {
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
};

export const addBudget = (budget: Budget): void => {
  const budgets = getBudgets();
  const existingIndex = budgets.findIndex(b => b.category === budget.category);
  
  if (existingIndex >= 0) {
    budgets[existingIndex] = budget;
  } else {
    budgets.push(budget);
  }
  
  setBudgets(budgets);
};

export const removeBudget = (category: ExpenseGroup): void => {
  const budgets = getBudgets().filter(b => b.category !== category);
  setBudgets(budgets);
};

export const confirmDeleteBudget = (_category: string) => {};

export const checkBudgetAlerts = (expenses: Array<{ category: string; amount: number; date: string }>): BudgetAlert[] => {
  const budgets = getBudgets();
  const now = new Date();
  const alerts: BudgetAlert[] = [];

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  budgets.forEach(budget => {
    const spent = expenses
      .filter(e => e.category === budget.category && new Date(e.date) >= monthStart)
      .reduce((sum, e) => sum + e.amount, 0);

    const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    
    if (percentage >= 80) {
      alerts.push({
        category: budget.category,
        spent,
        budget: budget.amount,
        percentage
      });
    }
  });

  return alerts;
};

export const getBudgetForGroup = (group: ExpenseGroup): Budget | undefined => {
  const budgets = getBudgets();
  return budgets.find(b => b.category === group);
};

export const getSpentByGroup = (group: ExpenseGroup, expenses: Array<{ category: string; amount: number; date: string }>): number => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return expenses
    .filter(e => e.category === group && new Date(e.date) >= monthStart)
    .reduce((sum, e) => sum + e.amount, 0);
};
