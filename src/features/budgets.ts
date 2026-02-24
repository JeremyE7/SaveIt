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

export const confirmDeleteBudget = (category: string) => {
  const budgets = getBudgets();
  const budget = budgets.find(b => b.category === category);
  if (!budget) return;

  const overlay = document.createElement('div');
  overlay.className = 'confirm-popup-overlay';
  overlay.innerHTML = `
    <div class="confirm-popup">
      <div class="confirm-popup-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <h3 class="confirm-popup-title">Eliminar Presupuesto</h3>
      <p class="confirm-popup-message">¿Estás seguro de eliminar el presupuesto de <strong>${budget.amount}$</strong>?</p>
      <div class="confirm-popup-buttons">
        <button class="confirm-popup-btn cancel" data-cancel>Cancelar</button>
        <button class="confirm-popup-btn danger" data-confirm>Eliminar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const handleConfirm = () => {
    cleanup();
    removeBudget(category);
    const event = new CustomEvent('budgetDeleted');
    window.dispatchEvent(event);
  };

  const handleCancel = () => {
    cleanup();
  };

  const cleanup = () => {
    overlay.remove();
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      handleCancel();
    }
  });

  overlay.querySelector('[data-cancel]')?.addEventListener('click', handleCancel);
  overlay.querySelector('[data-confirm]')?.addEventListener('click', handleConfirm);
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
