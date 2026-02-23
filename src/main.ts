import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { loadExpenses } from "./dom/htmlElements";
import { getAllExpenses } from "./features/expenses";
import { checkBudgetAlertsOnLoad, renderBudgetsList } from "./features/budgetModal";
import { getCurrentMonthTotal, getBudgetLeft, getExpensesCount, getCurrentMonthExpenses, formatDateRelative, getCategoryDistribution } from "./utils/general";
import { categories, type Category } from "./types/Categories";
import { generatePieChart } from "./features/graphs";

registerSW({ immediate: false });

const showView = (viewName: string) => {
  const views = ['home-view', 'stats-view', 'budgets-view'];
  views.forEach(view => {
    const el = document.getElementById(view);
    if (el) {
      el.classList.toggle('view-hidden', view !== viewName + '-view');
    }
  });

  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    }
  });

  if (viewName === 'stats') {
    loadStatsView();
  } else if (viewName === 'budgets') {
    loadBudgetsView();
  } else {
    loadHomeView();
  }
};

const loadHomeView = () => {
  const totalSpent = getCurrentMonthTotal();
  const budgetLeft = getBudgetLeft();
  const expensesCount = getExpensesCount();

  const spentEl = document.getElementById('total-spent');
  const budgetEl = document.getElementById('budget-left');
  const countEl = document.getElementById('expenses-count');

  if (spentEl) spentEl.textContent = `$${totalSpent.toFixed(2)}`;
  if (budgetEl) budgetEl.textContent = `$${budgetLeft.toFixed(2)}`;
  if (countEl) countEl.textContent = expensesCount.toString();

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const periodEl = document.getElementById('current-period');
  if (periodEl) {
    const now = new Date();
    periodEl.textContent = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  }

  const expenses = getCurrentMonthExpenses();
  const labels: string[] = [];
  const data: number[] = [];
  const colors: string[] = [];

  expenses.forEach((expense) => {
    const labelName = expense.category;
    if (labels.includes(labelName)) {
      const index = labels.indexOf(labelName);
      data[index] += expense.amount;
    } else {
      labels.push(labelName);
      data.push(expense.amount);
      colors.push(categories[expense.category as Category]?.color || '#666');
    }
  });

  generatePieChart(labels, data, colors);

  loadExpenses();
  renderCategoryBar();
};

const loadStatsView = () => {
  const totalSpent = getCurrentMonthTotal();
  const budgetLeft = getBudgetLeft();

  const spentEl = document.getElementById('stats-total-spent');
  const budgetEl = document.getElementById('stats-budget-left');

  if (spentEl) spentEl.textContent = `$${totalSpent.toFixed(2)}`;
  if (budgetEl) budgetEl.textContent = `$${budgetLeft.toFixed(2)}`;

  loadAllExpenses();
  renderStatsCategoryBar();
};

const loadBudgetsView = () => {
  renderBudgetsList();
};

const loadAllExpenses = () => {
  const container = document.getElementById('stats-expenses-list');
  if (!container) return;

  const expenses = getCurrentMonthExpenses().reverse();

  if (expenses.length === 0) {
    container.innerHTML = `
      <div class="expense-empty">
        <div class="expense-empty-icon">📊</div>
        <p>No hay gastos este mes</p>
      </div>
    `;
    return;
  }

  container.innerHTML = expenses.map(expense => {
    const cat = categories[expense.category as Category];
    return `
      <div class="expense-item" data-id="${expense.id}">
        <div class="expense-item-icon" style="background: ${cat?.color || '#666'}20; color: ${cat?.color || '#666'};">
          <span class="material-symbols-outlined">${getCategoryIcon(expense.category)}</span>
        </div>
        <div class="expense-item-details">
          <p class="expense-item-title">${expense.detail || cat?.label || expense.category}</p>
          <p class="expense-item-date">${formatDateRelative(expense.date)}</p>
        </div>
        <div class="expense-item-amount">-$${expense.amount.toFixed(2)}</div>
      </div>
    `;
  }).join('');
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

const renderCategoryBar = () => {
  const stats = getCategoryDistribution();
  const barContainer = document.getElementById('category-bar-container');
  const legendContainer = document.getElementById('category-legend');

  if (stats.length === 0) {
    if (barContainer) barContainer.innerHTML = '';
    if (legendContainer) legendContainer.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); font-size: 14px;">No hay gastos este mes</p>';
    return;
  }

  if (barContainer) {
    barContainer.innerHTML = `
      <div class="category-bar">
        ${stats.map(s => `<div class="category-bar-segment" style="width: ${s.percentage}%; background: ${s.color};"></div>`).join('')}
      </div>
    `;
  }

  if (legendContainer) {
    legendContainer.innerHTML = stats.slice(0, 4).map(s => `
      <div class="category-legend-item">
        <div class="category-legend-dot" style="background: ${s.color};"></div>
        <span class="category-legend-label">${s.label}</span>
        <span class="category-legend-value">${s.percentage.toFixed(0)}%</span>
      </div>
    `).join('');
  }
};

const renderStatsCategoryBar = () => {
  const stats = getCategoryDistribution();
  const barContainer = document.getElementById('stats-category-bar');
  const legendContainer = document.getElementById('stats-category-legend');

  if (stats.length === 0) {
    if (barContainer) barContainer.innerHTML = '';
    if (legendContainer) legendContainer.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); font-size: 14px;">No hay gastos este mes</p>';
    return;
  }

  if (barContainer) {
    barContainer.innerHTML = stats.map(s => `<div style="width: ${s.percentage}%; background: ${s.color}; height: 100%;"></div>`).join('');
  }

  if (legendContainer) {
    legendContainer.innerHTML = stats.map(s => `
      <div class="category-legend-item">
        <div class="category-legend-dot" style="background: ${s.color};"></div>
        <span class="category-legend-label">${s.label}</span>
        <span class="category-legend-value">$${s.amount.toFixed(2)} (${s.percentage.toFixed(0)}%)</span>
      </div>
    `).join('');
  }
};

const openBottomSheet = () => {
  const overlay = document.getElementById('bottom-sheet-overlay');
  if (overlay) overlay.classList.add('active');
};

const closeBottomSheet = () => {
  const overlay = document.getElementById('bottom-sheet-overlay');
  if (overlay) overlay.classList.remove('active');
  clearExpenseForm();
};

const clearExpenseForm = () => {
  const amountInput = document.getElementById('expense-amount') as HTMLInputElement;
  const detailInput = document.getElementById('expense-detail') as HTMLTextAreaElement;
  const dateInput = document.getElementById('expense-date') as HTMLInputElement;
  const categorySelect = document.getElementById('expense-category') as HTMLSelectElement;

  if (amountInput) amountInput.value = '';
  if (detailInput) detailInput.value = '';
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  if (categorySelect) categorySelect.value = '';
};

const loadCategorySelect = () => {
  const select = document.getElementById('expense-category') as HTMLSelectElement;
  const budgetSelect = document.getElementById('budget-category') as HTMLSelectElement;

  if (select) {
    const options = Object.entries(categories)
      .map(([key, cat]) => `<option value="${key}">${cat.label}</option>`)
      .join('');
    select.innerHTML = options;
  }

  if (budgetSelect) {
    budgetSelect.innerHTML = Object.entries(categories)
      .map(([key, cat]) => `<option value="${key}">${cat.label}</option>`)
      .join('');
  }

  loadQuickCategories();
};

const loadQuickCategories = () => {
  const container = document.getElementById('quick-categories');
  if (!container) return;

  const topCategories = ['food_home', 'transport_public', 'shopping_general', 'housing_utilities'];

  container.innerHTML = topCategories.map(cat => {
    const c = categories[cat as Category];
    return `
      <div class="quick-category" data-category="${cat}" style="border-color: ${c?.color}30;">
        <span class="material-symbols-outlined" style="font-size: 18px;">${getCategoryIcon(cat)}</span>
        <span>${c?.label.split(' ')[0] || cat}</span>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.quick-category').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-category');
      const select = document.getElementById('expense-category') as HTMLSelectElement;
      if (select && cat) select.value = cat;

      container.querySelectorAll('.quick-category').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
};

export const showSnackbar = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
  const snackbar = document.getElementById('snackbar');
  const snackbarMessage = document.getElementById('snackbar-message');
  const snackbarIcon = document.getElementById('snackbar-icon');

  if (!snackbar || !snackbarMessage || !snackbarIcon) return;

  snackbarMessage.textContent = message;
  snackbarIcon.className = `snackbar-icon ${type}`;

  const iconMap = {
    success: 'check',
    error: 'close',
    warning: 'warning'
  };
  snackbarIcon.innerHTML = `<span class="material-symbols-outlined">${iconMap[type]}</span>`;

  snackbar.classList.add('visible');

  setTimeout(() => {
    snackbar.classList.remove('visible');
  }, 3000);
};

const handleSaveExpense = () => {
  const amountInput = document.getElementById('expense-amount') as HTMLInputElement;
  const detailInput = document.getElementById('expense-detail') as HTMLTextAreaElement;
  const categorySelect = document.getElementById('expense-category') as HTMLSelectElement;
  const dateInput = document.getElementById('expense-date') as HTMLInputElement;

  const amount = parseFloat(amountInput?.value || '0');
  const detail = detailInput?.value?.trim() || '';
  const category = categorySelect?.value as Category;
  const date = dateInput?.value || new Date().toISOString().split('T')[0];

  if (!amount || amount <= 0) {
    showSnackbar('Ingresa un monto válido', 'error');
    return;
  }

  if (!category) {
    showSnackbar('Selecciona una categoría', 'error');
    return;
  }

  const expenses = getAllExpenses();
  const newExpense = {
    id: crypto.randomUUID(),
    amount,
    category,
    detail,
    date: new Date(date).toISOString()
  };

  expenses.unshift(newExpense);
  localStorage.setItem('expenses', JSON.stringify(expenses));
  localStorage.setItem('filteredExpenses', JSON.stringify(expenses));

  closeBottomSheet();
  loadHomeView();
  showSnackbar('Gasto guardado', 'success');
};

const handleSaveBudget = () => {
  const categorySelect = document.getElementById('budget-category') as HTMLSelectElement;
  const amountInput = document.getElementById('budget-amount') as HTMLInputElement;

  const category = categorySelect?.value;
  const amount = parseFloat(amountInput?.value || '0');

  if (!category) {
    showSnackbar('Selecciona una categoría', 'error');
    return;
  }

  if (!amount || amount <= 0) {
    showSnackbar('Ingresa un monto válido', 'error');
    return;
  }

  const budgets = JSON.parse(localStorage.getItem('budgets') || '[]');
  const existingIndex = budgets.findIndex((b: { category: string }) => b.category === category);

  const newBudget = { category, amount, period: 'monthly' as const };

  if (existingIndex >= 0) {
    budgets[existingIndex] = newBudget;
  } else {
    budgets.push(newBudget);
  }

  localStorage.setItem('budgets', JSON.stringify(budgets));

  amountInput.value = '';
  renderBudgetsList();
  loadHomeView();
  showSnackbar('Presupuesto guardado', 'success');
};

function setupEventListeners() {
  document.querySelectorAll('.bottom-nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-view');
      if (view) showView(view);
    });
  });

  document.getElementById('btn-add-expense')?.addEventListener('click', openBottomSheet);
  document.getElementById('fab-add')?.addEventListener('click', openBottomSheet);
  document.getElementById('btn-close-sheet')?.addEventListener('click', closeBottomSheet);
  document.getElementById('bottom-sheet-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeBottomSheet();
  });

  document.getElementById('btn-save-expense')?.addEventListener('click', handleSaveExpense);
  document.getElementById('btn-save-budget')?.addEventListener('click', handleSaveBudget);

  document.getElementById('btn-manage-budget')?.addEventListener('click', () => showView('budgets'));
  document.getElementById('btn-see-all')?.addEventListener('click', () => showView('stats'));

  document.getElementById('btn-back-stats')?.addEventListener('click', () => showView('home'));
  document.getElementById('btn-back-budgets')?.addEventListener('click', () => showView('home'));

  document.getElementById('alert-adjust')?.addEventListener('click', () => showView('budgets'));
}

async function initApp() {
  loadCategorySelect();
  clearExpenseForm();
  setupEventListeners();
  loadHomeView();
  checkBudgetAlertsOnLoad();
}

initApp();
