import { getAllExpenses } from "./expenses";
import { getBudgets, addBudget, removeBudget, type Budget, checkBudgetAlerts, type BudgetAlert } from "./budgets";
import { categories, type Category } from "../types/Categories";
import { showSuccess, showWarning } from "./toast";
import { withTransition } from "../utils/viewTransitions";

export const showBudgetsView = () => {
  const expensesView = document.getElementById('expenses-view');
  const budgetsView = document.getElementById('budgets-view');
  
  if (!expensesView || !budgetsView) return;

  withTransition(() => {
    expensesView.classList.add('hidden');
    budgetsView.classList.remove('hidden');
  });
  
  loadBudgetCategoryOptions();
  renderBudgetsList();
};

export const hideBudgetsView = () => {
  const expensesView = document.getElementById('expenses-view');
  const budgetsView = document.getElementById('budgets-view');
  
  if (!expensesView || !budgetsView) return;

  withTransition(() => {
    budgetsView.classList.add('hidden');
    expensesView.classList.remove('hidden');
  });
};

export const loadBudgetCategoryOptions = () => {
  const select = document.getElementById('budget-category') as HTMLSelectElement;
  if (!select) return;
  
  const options = Object.entries(categories)
    .map(([key, cat]) => `<option value="${key}">${cat.label}</option>`)
    .join('');
  select.innerHTML = options;
};

export const handleBudgetSubmit = (e: Event) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const formData = new FormData(form);
  
  const budget: Budget = {
    category: formData.get('category') as string,
    amount: parseFloat(formData.get('amount') as string),
    period: formData.get('period') as 'monthly' | 'weekly'
  };

  if (isNaN(budget.amount) || budget.amount <= 0) {
    showWarning('Ingresa un monto válido');
    return;
  }

  addBudget(budget);
  form.reset();
  renderBudgetsList();
  showSuccess('Presupuesto guardado');
  checkBudgetAlertsOnLoad();
};

export const renderBudgetsList = () => {
  const container = document.getElementById('budgets-list');
  const budgets = getBudgets();
  const expenses = getAllExpenses();
  
  if (!container) return;
  
  if (budgets.length === 0) {
    container.innerHTML = `
      <div class="budget-card p-8 text-center">
        <p class="text-neutral-500">No hay presupuestos configurados</p>
        <p class="text-neutral-600 text-sm mt-2">Crea tu primer presupuesto arriba</p>
      </div>
    `;
    return;
  }

  container.innerHTML = budgets.map(b => {
    const now = new Date();
    let periodStart: Date;
    
    if (b.period === 'weekly') {
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - 7);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const spent = expenses
      .filter(e => e.category === b.category && new Date(e.date) >= periodStart)
      .reduce((sum, e) => sum + e.amount, 0);

    const percentage = (spent / b.amount) * 100;
    const progressClass = percentage >= 100 ? 'danger' : percentage >= 80 ? 'warning' : 'safe';
    
    return `
      <div class="budget-item" data-category="${b.category}">
        <div class="flex-1">
          <div class="flex justify-between items-center mb-1">
            <span class="font-semibold">${categories[b.category as Category]?.label || b.category}</span>
            <span class="text-sm text-neutral-400">${spent.toFixed(0)} / ${b.amount}$ (${b.period === 'monthly' ? 'mes' : 'semana'})</span>
          </div>
          <div class="budget-progress">
            <div class="budget-progress-bar ${progressClass}" style="width: ${Math.min(percentage, 100)}%"></div>
          </div>
        </div>
        <button data-delete-budget="${b.category}" class="budget-delete-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-delete-budget]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const category = (e.target as HTMLElement).closest('[data-delete-budget]')?.getAttribute('data-delete-budget');
      if (category) {
        removeBudget(category);
        renderBudgetsList();
        showSuccess('Presupuesto eliminado');
      }
    });
  });
};

export const checkBudgetAlertsOnLoad = () => {
  const expenses = getAllExpenses();
  const alerts = checkBudgetAlerts(expenses);
  
  previousAlerts = alerts;
  
  alerts.forEach((alert: BudgetAlert) => {
    if (alert.percentage >= 100) {
      showWarning(`¡Has excedido el presupuesto de ${categories[alert.category as Category]?.label || alert.category}! (${alert.percentage.toFixed(0)}%)`);
    } else if (alert.percentage >= 80) {
      showWarning(`Alerta: Has usado el ${alert.percentage.toFixed(0)}% del presupuesto de ${categories[alert.category as Category]?.label || alert.category}`);
    }
  });
  
  renderBudgetAlerts(alerts);
};

export const renderBudgetAlerts = (alerts: BudgetAlert[]) => {
  const container = document.getElementById('budget-alerts');
  if (!container) return;
  
  if (alerts.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = alerts.map(alert => {
    const isDanger = alert.percentage >= 100;
    return `
      <div class="budget-alert ${isDanger ? 'danger' : 'warning'}">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>${isDanger ? '¡Presupuesto excedido!' : 'Alerta de presupuesto'} ${categories[alert.category as Category]?.label || alert.category}: ${alert.percentage.toFixed(0)}%</span>
      </div>
    `;
  }).join('');
};

let previousAlerts: BudgetAlert[] = [];

export const updateBudgetAlerts = () => {
  const expenses = getAllExpenses();
  const alerts = checkBudgetAlerts(expenses);
  
  const hasSignificantChange = (newAlerts: BudgetAlert[], oldAlerts: BudgetAlert[]) => {
    if (newAlerts.length !== oldAlerts.length) return true;
    
    for (let i = 0; i < newAlerts.length; i++) {
      const newAlert = newAlerts[i];
      const oldAlert = oldAlerts.find(a => a.category === newAlert.category);
      if (!oldAlert) return true;
      if (Math.abs(newAlert.percentage - oldAlert.percentage) >= 5) return true;
    }
    return false;
  };
  
  if (hasSignificantChange(alerts, previousAlerts)) {
    alerts.forEach((alert: BudgetAlert) => {
      const oldAlert = previousAlerts.find(a => a.category === alert.category);
      const oldPercentage = oldAlert?.percentage || 0;
      
      if (alert.percentage >= 100 && oldPercentage < 100) {
        showWarning(`¡Has excedido el presupuesto de ${categories[alert.category as Category]?.label || alert.category}! (${alert.percentage.toFixed(0)}%)`);
      } else if (alert.percentage >= 80 && oldPercentage < 80) {
        showWarning(`Alerta: Has usado el ${alert.percentage.toFixed(0)}% del presupuesto de ${categories[alert.category as Category]?.label || alert.category}`);
      }
    });
  }
  
  previousAlerts = alerts;
  renderBudgetAlerts(alerts);
};

export const getCategoryBudgetStatus = (category: string): { hasBudget: boolean; spent: number; budget: number; percentage: number } | null => {
  const budgets = getBudgets();
  const budget = budgets.find(b => b.category === category);
  
  if (!budget) return null;
  
  const expenses = getAllExpenses();
  const now = new Date();
  let periodStart: Date;
  
  if (budget.period === 'weekly') {
    periodStart = new Date(now);
    periodStart.setDate(now.getDate() - 7);
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const spent = expenses
    .filter(e => e.category === category && new Date(e.date) >= periodStart)
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    hasBudget: true,
    spent,
    budget: budget.amount,
    percentage: (spent / budget.amount) * 100
  };
};
