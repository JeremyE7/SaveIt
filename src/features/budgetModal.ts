import { getAllExpenses } from "./expenses";
import { getBudgets, addBudget, removeBudget, type Budget, checkBudgetAlerts, type BudgetAlert } from "./budgets";
import { categories, type Category } from "../types/Categories";

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
    return;
  }

  addBudget(budget);
  form.reset();
  renderBudgetsList();
  checkBudgetAlertsOnLoad();
};

export const renderBudgetsList = () => {
  const container = document.getElementById('budgets-list');
  const budgets = getBudgets();
  const expenses = getAllExpenses();
  
  if (!container) return;
  
  if (budgets.length === 0) {
    container.innerHTML = `
      <div class="expense-empty">
        <p>No hay presupuestos configurados</p>
        <p style="font-size: 12px; margin-top: 8px; color: var(--color-text-secondary);">Crea tu primer presupuesto arriba</p>
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
    const cat = categories[b.category as Category];
    
    return `
      <div class="budget-item" data-category="${b.category}">
        <div class="budget-item-header">
          <div class="budget-item-category">
            <div class="budget-item-icon" style="background: ${cat?.color || '#666'}20; color: ${cat?.color || '#666'};">
              <span class="material-symbols-outlined">${getCategoryIcon(b.category)}</span>
            </div>
            <div>
              <p class="budget-item-name">${cat?.label || b.category}</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <p class="budget-item-amount">${spent.toFixed(0)} / ${b.amount}$ <span>(${b.period === 'monthly' ? 'mes' : 'semana'})</span></p>
            <button data-delete-budget="${b.category}" class="budget-delete-btn">
              <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
            </button>
          </div>
        </div>
        <div class="budget-progress">
          <div class="budget-progress-bar ${progressClass}" style="width: ${Math.min(percentage, 100)}%"></div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-delete-budget]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const category = (e.target as HTMLElement).closest('[data-delete-budget]')?.getAttribute('data-delete-budget');
      if (category) {
        removeBudget(category);
        renderBudgetsList();
        checkBudgetAlertsOnLoad();
      }
    });
  });
};

const getCategoryIcon = (category: string): string => {
  const iconMap: Record<string, string> = {
    food_home: 'local_grocery_store',
    food_restaurant: 'restaurant',
    transport_public: 'directions_bus',
    transport_fuel: 'local_gas_station',
    transport_taxi: 'local_taxi',
    housing_rent: 'home',
    housing_utilities: 'bolt',
    housing_internet: 'wifi',
    shopping_clothes: 'checkroom',
    shopping_electronics: 'devices',
    health_medicine: 'medication',
    health_doctor: 'medical_services',
    entertainment_streaming: 'smart_display',
    entertainment_games: 'sports_esports',
    education_courses: 'school',
    work_tools: 'build',
    finance_fees: 'account_balance',
    personal_care: 'spa',
    cleaning: 'cleaning_services',
    gifts: 'card_giftcard',
    pets: 'pets',
    travel: 'flight',
    other: 'more_horiz',
  };
  return iconMap[category] || 'receipt';
};

export const checkBudgetAlertsOnLoad = () => {
  const expenses = getAllExpenses();
  const alerts = checkBudgetAlerts(expenses);
  renderBudgetAlerts(alerts);
};

export const renderBudgetAlerts = (alerts: BudgetAlert[]) => {
  const container = document.getElementById('budget-alerts');
  const banner = document.getElementById('budget-alerts');
  
  if (!container || !banner) return;
  
  if (alerts.length === 0) {
    banner.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  banner.style.display = 'flex';
  
  const worstAlert = alerts.reduce((worst, alert) => 
    alert.percentage > worst.percentage ? alert : worst
  , alerts[0]);

  const isDanger = worstAlert.percentage >= 100;
  const alertMessage = document.getElementById('alert-message');
  
  if (alertMessage) {
    if (isDanger) {
      alertMessage.textContent = `¡Has excedido el presupuesto de ${categories[worstAlert.category as Category]?.label || worstAlert.category}!`;
    } else {
      alertMessage.textContent = `Has usado el ${worstAlert.percentage.toFixed(0)}% de tu presupuesto`;
    }
  }

  container.innerHTML = alerts.map(alert => {
    const isAlertDanger = alert.percentage >= 100;
    return `
      <div class="budget-alert ${isAlertDanger ? 'danger' : 'warning'}">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>${isAlertDanger ? '¡Presupuesto excedido!' : 'Alerta'} ${categories[alert.category as Category]?.label || alert.category}: ${alert.percentage.toFixed(0)}%</span>
      </div>
    `;
  }).join('');
};

export const updateBudgetAlerts = () => {
  const expenses = getAllExpenses();
  const alerts = checkBudgetAlerts(expenses);
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
