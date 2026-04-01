import { getAllExpenses } from "./expenses";
import { getBudgets, checkBudgetAlerts, type BudgetAlert, getSpentByGroup } from "./budgets";
import { expenseGroups, type ExpenseGroup } from "../types/ExpenseGroups";
import { getBudgetConfig, setBudgetConfig, calculateBudgetAmounts, isValidBudgetConfig, type BudgetConfig } from "../types/BudgetConfig";
import { getCurrentMonthIncomeTotal } from "../utils/general";

export const loadBudgetCategoryOptions = () => {};

export const handleBudgetSubmit = (_e: Event) => {};

export const renderBudgetsList = () => {
  const container = document.getElementById('budgets-list');
  const config = getBudgetConfig();
  const budgets = getBudgets();
  const expenses = getAllExpenses();
  const totalIncome = getCurrentMonthIncomeTotal();
  
  if (!container) return;
  
  if (totalIncome <= 0) {
    container.innerHTML = `
      <div class="expense-empty">
        <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.3;">account_balance_wallet</span>
        <p>No hay ingresos registrados</p>
        <p style="font-size: 12px; margin-top: 8px; color: var(--color-text-secondary);">Registra tus ingresos primero</p>
      </div>
    `;
    return;
  }

  const amounts = calculateBudgetAmounts(config, totalIncome);

  container.innerHTML = (['needs', 'wants', 'savings'] as ExpenseGroup[]).map(group => {
    const groupInfo = expenseGroups[group];
    const budget = budgets.find(b => b.category === group);
    const budgetAmount = budget?.amount || amounts[group];
    const spent = getSpentByGroup(group, expenses);
    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
    const progressClass = percentage >= 100 ? 'danger' : percentage >= 80 ? 'warning' : 'safe';
    
    return `
      <div class="budget-item" data-category="${group}">
        <div class="budget-item-header">
          <div class="budget-item-category">
            <div class="budget-item-icon" style="background: ${groupInfo.color}20; color: ${groupInfo.color};">
              <span class="material-symbols-outlined">${groupInfo.icon}</span>
            </div>
            <div>
              <p class="budget-item-name">${groupInfo.label}</p>
              <p class="budget-item-desc">${groupInfo.description}</p>
            </div>
          </div>
        </div>
        <div class="budget-item-progress-info">
          <p class="budget-item-amount">${spent.toFixed(2)} / ${budgetAmount.toFixed(2)}$ <span>(${config[group]}%)</span></p>
        </div>
        <div class="budget-progress">
          <div class="budget-progress-bar ${progressClass}" style="width: ${Math.min(percentage || 0, 100)}%; background: ${groupInfo.color};"></div>
        </div>
      </div>
    `;
  }).join('');
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
  const groupInfo = expenseGroups[worstAlert.category];
  
  if (alertMessage) {
    if (isDanger) {
      alertMessage.textContent = `¡Has excedido el presupuesto de ${groupInfo.label}!`;
    } else {
      alertMessage.textContent = `Has usado el ${worstAlert.percentage.toFixed(0)}% de ${groupInfo.label}`;
    }
  }

  container.innerHTML = alerts.map(alert => {
    const isAlertDanger = alert.percentage >= 100;
    const gInfo = expenseGroups[alert.category];
    return `
      <div class="budget-alert ${isAlertDanger ? 'danger' : 'warning'}">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>${isAlertDanger ? '¡Presupuesto excedido!' : 'Alerta'} ${gInfo.label}: ${alert.percentage.toFixed(0)}%</span>
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
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const spent = expenses
    .filter(e => e.category === category && new Date(e.date) >= monthStart)
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    hasBudget: true,
    spent,
    budget: budget.amount,
    percentage: (spent / budget.amount) * 100
  };
};

export const openBudgetConfigModal = () => {
  const overlay = document.getElementById('budget-sheet-overlay');
  if (!overlay) return;

  const config = getBudgetConfig();
  
  const needsInput = document.getElementById('budget-needs-percent') as HTMLInputElement;
  const wantsInput = document.getElementById('budget-wants-percent') as HTMLInputElement;
  const savingsInput = document.getElementById('budget-savings-percent') as HTMLInputElement;

  if (needsInput) needsInput.value = config.needs.toString();
  if (wantsInput) wantsInput.value = config.wants.toString();
  if (savingsInput) savingsInput.value = config.savings.toString();

  updateBudgetPreview();

  overlay.classList.add('active');
};

export const closeBudgetConfigModal = () => {
  const overlay = document.getElementById('budget-sheet-overlay');
  if (overlay) overlay.classList.remove('active');
};

export const handleBudgetConfigSave = () => {
  const needsInput = document.getElementById('budget-needs-percent') as HTMLInputElement;
  const wantsInput = document.getElementById('budget-wants-percent') as HTMLInputElement;
  const savingsInput = document.getElementById('budget-savings-percent') as HTMLInputElement;

  const newConfig: Partial<BudgetConfig> = {
    needs: parseFloat(needsInput?.value || '0'),
    wants: parseFloat(wantsInput?.value || '0'),
    savings: parseFloat(savingsInput?.value || '0')
  };

  if (!isValidBudgetConfig(newConfig)) {
    const snackbar = document.getElementById('snackbar');
    const snackbarMessage = document.getElementById('snackbar-message');
    const snackbarIcon = document.getElementById('snackbar-icon');
    if (snackbar && snackbarMessage && snackbarIcon) {
      snackbarMessage.textContent = 'Los porcentajes deben sumar 100%';
      snackbarIcon.className = 'snackbar-icon error';
      snackbarIcon.innerHTML = '<span class="material-symbols-outlined">error</span>';
      snackbar.classList.add('show');
      setTimeout(() => snackbar.classList.remove('show'), 3000);
    }
    return;
  }

  setBudgetConfig(newConfig as BudgetConfig);
  closeBudgetConfigModal();
  
  renderBudgetsList();
  checkBudgetAlertsOnLoad();

  const snackbar = document.getElementById('snackbar');
  const snackbarMessage = document.getElementById('snackbar-message');
  const snackbarIcon = document.getElementById('snackbar-icon');
  if (snackbar && snackbarMessage && snackbarIcon) {
    snackbarMessage.textContent = 'Presupuestos actualizados';
    snackbarIcon.className = 'snackbar-icon success';
    snackbarIcon.innerHTML = '<span class="material-symbols-outlined">check</span>';
    snackbar.classList.add('show');
    setTimeout(() => snackbar.classList.remove('show'), 3000);
  }
};

export const updateBudgetPreview = () => {
  const needsInput = document.getElementById('budget-needs-percent') as HTMLInputElement;
  const wantsInput = document.getElementById('budget-wants-percent') as HTMLInputElement;
  const savingsInput = document.getElementById('budget-savings-percent') as HTMLInputElement;

  const previewNeeds = document.getElementById('preview-needs');
  const previewWants = document.getElementById('preview-wants');
  const previewSavings = document.getElementById('preview-savings');

  const totalIncome = getCurrentMonthIncomeTotal();
  const needs = parseFloat(needsInput?.value || '0');
  const wants = parseFloat(wantsInput?.value || '0');
  const savings = parseFloat(savingsInput?.value || '0');

  const total = needs + wants + savings;

  const totalEl = document.getElementById('budget-total-percent');
  if (totalEl) {
    totalEl.textContent = `${total}%`;
    totalEl.style.color = total === 100 ? '#10B981' : '#ef4444';
  }

  if (previewNeeds) {
    previewNeeds.textContent = totalIncome > 0 ? `$${((totalIncome * needs) / 100).toFixed(2)}` : '$0.00';
  }
  if (previewWants) {
    previewWants.textContent = totalIncome > 0 ? `$${((totalIncome * wants) / 100).toFixed(2)}` : '$0.00';
  }
  if (previewSavings) {
    previewSavings.textContent = totalIncome > 0 ? `$${((totalIncome * savings) / 100).toFixed(2)}` : '$0.00';
  }
};
