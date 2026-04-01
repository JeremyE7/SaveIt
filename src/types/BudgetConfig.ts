import type { ExpenseGroup } from "./ExpenseGroups";
import { expenseGroups } from "./ExpenseGroups";

export interface BudgetConfig {
  needs: number;
  wants: number;
  savings: number;
}

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  needs: 50,
  wants: 30,
  savings: 20
};

export const getBudgetConfig = (): BudgetConfig => {
  const stored = localStorage.getItem('budgetConfig');
  return stored ? JSON.parse(stored) : DEFAULT_BUDGET_CONFIG;
};

export const setBudgetConfig = (config: BudgetConfig): void => {
  localStorage.setItem('budgetConfig', JSON.stringify(config));
};

export const calculateBudgetAmounts = (config: BudgetConfig, monthlyIncome: number): Record<ExpenseGroup, number> => {
  return {
    needs: (monthlyIncome * config.needs) / 100,
    wants: (monthlyIncome * config.wants) / 100,
    savings: (monthlyIncome * config.savings) / 100
  };
};

export const getBudgetPercentages = (): BudgetConfig => {
  return getBudgetConfig();
};

export const isValidBudgetConfig = (config: Partial<BudgetConfig>): boolean => {
  const { needs = 0, wants = 0, savings = 0 } = config;
  return (needs + wants + savings) === 100;
};

export const getGroupInfo = (group: ExpenseGroup) => {
  return expenseGroups[group];
};
