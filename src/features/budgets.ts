export interface Budget {
  category: string;
  amount: number;
  period: 'monthly' | 'weekly';
}

export interface BudgetAlert {
  category: string;
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

export const removeBudget = (category: string): void => {
  const budgets = getBudgets().filter(b => b.category !== category);
  setBudgets(budgets);
};

export const checkBudgetAlerts = (expenses: Array<{ category: string; amount: number; date: string }>): BudgetAlert[] => {
  const budgets = getBudgets();
  const now = new Date();
  const alerts: BudgetAlert[] = [];

  budgets.forEach(budget => {
    let periodStart: Date;
    
    if (budget.period === 'weekly') {
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - 7);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const spent = expenses
      .filter(e => e.category === budget.category && new Date(e.date) >= periodStart)
      .reduce((sum, e) => sum + e.amount, 0);

    const percentage = (spent / budget.amount) * 100;
    
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
