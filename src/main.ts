import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { loadExpenses } from "./dom/htmlElements";
import { getAllExpenses, confirmDeleteExpense, setExpenseToEdit } from "./features/expenses";
import { getAllIncomes } from "./features/incomes";
import { checkBudgetAlertsOnLoad, renderBudgetsList, openBudgetConfigModal, closeBudgetConfigModal, handleBudgetConfigSave, updateBudgetPreview } from "./features/budgetModal";
import { getCurrentMonthTotal, getCurrentMonthExpenses, getCategoryDistribution, getCurrentMonthIncomeTotal, getExpensesByMonth, getIncomesByMonth, getMonthTotal, getIncomeMonthTotal, getAllExpensesTotal, getAllIncomesTotal } from "./utils/general";
import { expenseGroups, type ExpenseGroup } from "./types/ExpenseGroups";
import { incomeCategories, type IncomeCategory } from "./types/IncomeCategories";
import { generatePieChart } from "./features/graphs";
import { initSwipeExpense, initSwipeIncome, initSwipeCategory, openEditModal, openEditIncomeModal } from "./utils/swipe";
import { exportData, importData } from "./features/importExport";
import { confirmDeleteIncome } from "./features/incomes";
import type { Expense } from "./types/Expense";
import type { Income } from "./types/Income";

registerSW({ immediate: false });

let currentView = 'home';

const viewOrder: Record<string, number> = {
  home: 0,
  stats: 1,
  budgets: 2,
  profile: 3
};

const viewNames = Object.keys(viewOrder);

const initViewSwipe = () => {
  const appContainer = document.querySelector('.app-container') as HTMLElement;
  if (!appContainer) return;

  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  let ignoreViewSwipe = false;
  const SWIPE_THRESHOLD = 100;

  const handleTouchStart = (e: TouchEvent) => {
    const target = e.target as HTMLElement;
    const isOnItem = target.closest('.expense-item');
    
    if (isOnItem) {
      ignoreViewSwipe = true;
      return;
    }
    
    ignoreViewSwipe = false;
    startX = e.touches[0].clientX;
    currentX = startX;
    isDragging = true;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || ignoreViewSwipe) return;
    currentX = e.touches[0].clientX;
    const diffX = Math.abs(currentX - startX);
    if (diffX < 10) {
      isDragging = false;
    }
  };

  const handleTouchEnd = () => {
    if (ignoreViewSwipe) {
      isDragging = false;
      ignoreViewSwipe = false;
      return;
    }
    
    if (!isDragging) return;
    isDragging = false;

    const diffX = currentX - startX;
    const isHorizontalSwipe = Math.abs(diffX) > SWIPE_THRESHOLD;

    if (isHorizontalSwipe) {
      const currentIndex = viewOrder[currentView];
      
      if (diffX < 0 && currentIndex < viewNames.length - 1) {
        const nextView = viewNames[currentIndex + 1];
        showView(nextView);
      } else if (diffX > 0 && currentIndex > 0) {
        const prevView = viewNames[currentIndex - 1];
        showView(prevView);
      }
    }

    startX = 0;
    currentX = 0;
    ignoreViewSwipe = false;
  };

  appContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
  appContainer.addEventListener('touchmove', handleTouchMove, { passive: true });
  appContainer.addEventListener('touchend', handleTouchEnd);
};

const showView = (viewName: string) => {
  if (viewName === currentView) return;

  const currentIndex = viewOrder[currentView] || 0;
  const newIndex = viewOrder[viewName] || 0;
  const direction = newIndex > currentIndex ? 'forward' : 'backward';

  const currentEl = document.getElementById(currentView + '-view');
  const newEl = document.getElementById(viewName + '-view');

  if (direction === 'forward') {
    currentEl?.classList.add('view-slide-out-left');
    newEl?.classList.remove('view-hidden');
    newEl?.classList.add('view-slide-in-right');
  } else {
    currentEl?.classList.add('view-slide-out-right');
    newEl?.classList.remove('view-hidden');
    newEl?.classList.add('view-slide-in-left');
  }

  setTimeout(() => {
    currentEl?.classList.remove('view-slide-out-left', 'view-slide-out-right');
    newEl?.classList.remove('view-slide-in-right', 'view-slide-in-left');

    const views = ['home-view', 'stats-view', 'budgets-view', 'profile-view'];
    views.forEach(view => {
      const el = document.getElementById(view);
      if (el) {
        el.classList.toggle('view-hidden', view !== viewName + '-view');
      }
    });

    currentView = viewName;
  }, 300);

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
  } else if (viewName === 'profile') {
    loadProfileView();
  } else {
    loadHomeView();
  }
};

const loadHomeView = () => {
  const totalSpent = getCurrentMonthTotal();
  const totalIncome = getCurrentMonthIncomeTotal();
  const balance = totalIncome - totalSpent;

  const incomeEl = document.getElementById('total-income');
  const spentEl = document.getElementById('total-spent');
  const balanceEl = document.getElementById('balance');

  if (incomeEl) incomeEl.textContent = `$${totalIncome.toFixed(2)}`;
  if (spentEl) spentEl.textContent = `$${totalSpent.toFixed(2)}`;
  if (balanceEl) {
    const balanceValue = balance >= 0 ? `+$${balance.toFixed(2)}` : `-$${Math.abs(balance).toFixed(2)}`;
    balanceEl.textContent = balanceValue;
    balanceEl.className = balance >= 0 ? 'summary-card-value green' : 'summary-card-value';
  }

  const userSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
  const usernameEl = document.getElementById('dashboard-username');
  const avatarEl = document.getElementById('dashboard-avatar');
  
  if (usernameEl) {
    usernameEl.textContent = userSettings.name || 'SaveIt';
  }
  if (avatarEl && userSettings.name) {
    const initial = userSettings.name.charAt(0).toUpperCase();
    avatarEl.innerHTML = `<span class="dashboard-avatar-initial">${initial}</span>`;
    avatarEl.style.background = '#30c9e8';
  } else if (avatarEl) {
    avatarEl.innerHTML = '<span class="material-symbols-outlined">account_circle</span>';
    avatarEl.style.background = '';
  }

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

  const getExpenseColor = (category: string): string => {
    if (category.startsWith('custom_')) {
      const categoryId = category.replace('custom_', '');
      const customCategories = getCustomCategories();
      const customCat = customCategories.find(c => c.id === categoryId && c.type === 'expense');
      if (customCat) return customCat.color;
    }
    return expenseGroups[category as ExpenseGroup]?.color || '#666';
  };

  const getExpenseLabel = (category: string): string => {
    if (category.startsWith('custom_')) {
      const categoryId = category.replace('custom_', '');
      const customCategories = getCustomCategories();
      const customCat = customCategories.find(c => c.id === categoryId && c.type === 'expense');
      if (customCat) return customCat.name;
    }
    return expenseGroups[category as ExpenseGroup]?.label || category;
  };

  const categoryMap = new Map<string, string>();

  expenses.forEach((expense) => {
    if (!categoryMap.has(expense.category)) {
      categoryMap.set(expense.category, getExpenseLabel(expense.category));
    }
    const labelName = categoryMap.get(expense.category);
    if (labels.includes(labelName || expense.category)) {
      const index = labels.indexOf(labelName || expense.category);
      data[index] += expense.amount;
    } else {
      labels.push(labelName || expense.category);
      data.push(expense.amount);
      colors.push(getExpenseColor(expense.category));
    }
  });

  generatePieChart(labels, data, colors);

  loadExpenses();
  renderCategoryBar();
};

let statsSelectedYear: number;
let statsSelectedMonth: number;
let statsCurrentTab: 'expenses' | 'incomes' = 'expenses';

const getMonthName = (month: number): string => {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return months[month];
};

const populatePeriodSelect = () => {
  const select = document.getElementById('stats-period-select') as HTMLSelectElement;
  if (!select) return;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  select.innerHTML = '<option value="all">Todo</option>';

  for (let year = currentYear; year >= currentYear - 5; year--) {
    const startMonth = year === currentYear ? currentMonth : 11;
    const endMonth = year === currentYear ? currentMonth : 0;

    for (let month = startMonth; month >= endMonth; month--) {
      const option = document.createElement('option');
      option.value = `${year}-${month}`;
      option.textContent = `${getMonthName(month)} ${year}`;
      select.appendChild(option);
    }
  }

  select.value = `${currentYear}-${currentMonth}`;
  statsSelectedYear = currentYear;
  statsSelectedMonth = currentMonth;
};

const loadStatsView = () => {
  const now = new Date();
  statsSelectedYear = now.getFullYear();
  statsSelectedMonth = now.getMonth();
  statsCurrentTab = 'expenses';

  populatePeriodSelect();
  populateCategoryFilter();
  updateStatsCards();
  loadStatsExpenses();
  setupStatsTabs();
  setupStatsFilters();
  setupStatsPeriodNavigation();
  setupStatsImportExport();
};

const updateStatsCards = () => {
  const select = document.getElementById('stats-period-select') as HTMLSelectElement;
  const value = select?.value;

  let totalIncome: number;
  let totalSpent: number;

  if (value === 'all') {
    totalIncome = getAllIncomesTotal();
    totalSpent = getAllExpensesTotal();
  } else {
    const [year, month] = value.split('-').map(Number);
    totalIncome = getIncomeMonthTotal(year, month);
    totalSpent = getMonthTotal(year, month);
  }

  const balance = totalIncome - totalSpent;

  const incomeEl = document.getElementById('stats-total-income');
  const spentEl = document.getElementById('stats-total-spent');
  const balanceEl = document.getElementById('stats-balance');

  if (incomeEl) incomeEl.textContent = `$${totalIncome.toFixed(2)}`;
  if (spentEl) spentEl.textContent = `$${totalSpent.toFixed(2)}`;
  if (balanceEl) {
    balanceEl.textContent = balance >= 0 ? `+$${balance.toFixed(2)}` : `-$${Math.abs(balance).toFixed(2)}`;
    balanceEl.className = balance >= 0 ? 'stat-card-value income' : 'stat-card-value expense';
  }
};

const populateCategoryFilter = (type: 'expenses' | 'incomes' = 'expenses') => {
  const select = document.getElementById('stats-filter-category') as HTMLSelectElement;
  if (!select) return;

  let options = '';
  const customCategories = getCustomCategories();

  if (type === 'expenses') {
    const defaultOptions = Object.entries(expenseGroups)
      .map(([key, group]) => `<option value="${key}">${group.label}</option>`)
      .join('');
    const customOptions = customCategories.filter(c => c.type === 'expense')
      .map(cat => `<option value="custom_${cat.id}">${cat.name} (Personalizado)</option>`)
      .join('');
    options = defaultOptions + customOptions;
  } else {
    const defaultOptions = Object.entries(incomeCategories)
      .map(([key, cat]) => `<option value="${key}">${cat.label}</option>`)
      .join('');
    const customOptions = customCategories.filter(c => c.type === 'income')
      .map(cat => `<option value="custom_${cat.id}">${cat.name} (Personalizado)</option>`)
      .join('');
    options = defaultOptions + customOptions;
  }

  select.innerHTML = `<option value="">Todas las ${type === 'expenses' ? 'categorías' : 'fuentes'}</option>${options}`;
};

const getFilteredExpenses = (): Expense[] => {
  const select = document.getElementById('stats-period-select') as HTMLSelectElement;
  const dateStart = (document.getElementById('stats-filter-date-start') as HTMLInputElement)?.value;
  const dateEnd = (document.getElementById('stats-filter-date-end') as HTMLInputElement)?.value;
  const categoryFilter = (document.getElementById('stats-filter-category') as HTMLSelectElement)?.value;

  let expenses: Expense[];

  if (select?.value === 'all') {
    expenses = getAllExpenses();
  } else {
    const [year, month] = select?.value.split('-').map(Number) || [statsSelectedYear, statsSelectedMonth];
    expenses = getExpensesByMonth(year, month);
  }

  if (dateStart) {
    expenses = expenses.filter(e => new Date(e.date) >= new Date(dateStart));
  }
  if (dateEnd) {
    expenses = expenses.filter(e => new Date(e.date) <= new Date(dateEnd + 'T23:59:59'));
  }
  if (categoryFilter) {
    expenses = expenses.filter(e => e.category === categoryFilter);
  }

  return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const getFilteredIncomes = (): Income[] => {
  const select = document.getElementById('stats-period-select') as HTMLSelectElement;
  const dateStart = (document.getElementById('stats-filter-date-start') as HTMLInputElement)?.value;
  const dateEnd = (document.getElementById('stats-filter-date-end') as HTMLInputElement)?.value;
  const categoryFilter = (document.getElementById('stats-filter-category') as HTMLSelectElement)?.value;

  let incomes: Income[];

  if (select?.value === 'all') {
    incomes = getAllIncomes();
  } else {
    const [year, month] = select?.value.split('-').map(Number) || [statsSelectedYear, statsSelectedMonth];
    incomes = getIncomesByMonth(year, month);
  }

  if (dateStart) {
    incomes = incomes.filter(i => new Date(i.date) >= new Date(dateStart));
  }
  if (dateEnd) {
    incomes = incomes.filter(i => new Date(i.date) <= new Date(dateEnd + 'T23:59:59'));
  }
  if (categoryFilter) {
    incomes = incomes.filter(i => i.category === categoryFilter);
  }

  return incomes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const loadStatsExpenses = () => {
  const container = document.getElementById('stats-expenses-list');
  const incomesContainer = document.getElementById('stats-incomes-list');
  if (!container || !incomesContainer) return;

  const expenses = getFilteredExpenses();

  if (expenses.length === 0) {
    container.innerHTML = `
      <div class="expense-empty">
        <div class="expense-empty-icon">📊</div>
        <p>No hay gastos</p>
      </div>
    `;
  } else {
    container.innerHTML = expenses.map(expense => {
      const customCategories = getCustomCategories();
      const categoryId = expense.category.replace('custom_', '');
      const customCat = customCategories.find(c => c.id === categoryId && c.type === 'expense');
      
      let cat: { label?: string; color?: string } | undefined;
      let catIcon: string;

      if (customCat) {
        cat = { label: customCat.name, color: customCat.color };
        catIcon = customCat.icon;
      } else {
        const expenseCatKey = expense.category as ExpenseGroup;
        cat = expenseGroups[expenseCatKey];
        catIcon = getCategoryIcon(expense.category);
      }

      const catColor = cat?.color || '#666';
      return `
        <div class="expense-item" data-id="${expense.id}">
          <div class="expense-item-left">
            <div class="expense-item-icon" style="background: ${catColor}20; color: ${catColor};">
              <span class="material-symbols-outlined" style="font-size: 20px;">${catIcon}</span>
            </div>
            <div class="expense-item-details">
              <p class="expense-item-title">${expense.detail || cat?.label || expense.category}</p>
              <div class="expense-item-category-badge">
                <span class="badge-dot" style="background: ${catColor};"></span>
                ${cat?.label || expense.category}
              </div>
            </div>
          </div>
          <div class="expense-item-amount">-$${expense.amount.toFixed(2)}</div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.expense-item').forEach((item) => {
      const expense = expenses.find(e => e.id === (item as HTMLElement).dataset.id);
      if (expense) {
        initSwipeExpense(
          item as HTMLElement,
          expense,
          (exp) => {
            setExpenseToEdit(exp);
            openEditModal(exp);
          },
          (id) => {
            confirmDeleteExpense(id);
            setTimeout(() => {
              loadStatsExpenses();
              updateStatsCards();
            }, 300);
          }
        );
      }
    });
  }
};

const loadStatsIncomes = () => {
  const container = document.getElementById('stats-incomes-list');
  const expensesContainer = document.getElementById('stats-expenses-list');
  if (!container || !expensesContainer) return;

  const incomes = getFilteredIncomes();

  if (incomes.length === 0) {
    container.innerHTML = `
      <div class="expense-empty">
        <div class="expense-empty-icon">💰</div>
        <p>No hay ingresos</p>
      </div>
    `;
  } else {
    container.innerHTML = incomes.map(income => {
      const customCategories = getCustomCategories();
      const categoryId = income.category.replace('custom_', '');
      const customCat = customCategories.find(c => c.id === categoryId && c.type === 'income');
      let cat: { label?: string; color?: string } | undefined;
      let catIcon: string;

      if (customCat) {
        cat = { label: customCat.name, color: customCat.color };
        catIcon = customCat.icon;
      } else {
        const incomeCatKey = income.category as IncomeCategory;
        cat = incomeCategories[incomeCatKey];
        catIcon = getCategoryIcon(income.category);
      }

      const catColor = cat?.color || '#22c55e';
      return `
        <div class="expense-item" data-id="${income.id}">
          <div class="expense-item-left">
            <div class="expense-item-icon" style="background: ${catColor}20; color: ${catColor};">
              <span class="material-symbols-outlined" style="font-size: 20px;">${catIcon}</span>
            </div>
            <div class="expense-item-details">
              <p class="expense-item-title">${income.detail || cat?.label || income.category}</p>
              <div class="expense-item-category-badge">
                <span class="badge-dot" style="background: ${catColor};"></span>
                ${cat?.label || income.category}
              </div>
            </div>
          </div>
          <div class="expense-item-amount income">+$${income.amount.toFixed(2)}</div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.expense-item').forEach((item) => {
      const income = incomes.find(i => i.id === (item as HTMLElement).dataset.id);
      if (income) {
        initSwipeIncome(
          item as HTMLElement,
          income,
          (inc) => {
            openEditIncomeModal(inc);
          },
          (id) => {
            confirmDeleteIncome(id);
            setTimeout(() => {
              loadStatsIncomes();
              updateStatsCards();
            }, 300);
          }
        );
      }
    });
  }
};

const setupStatsTabs = () => {
  const tabs = document.querySelectorAll('.stats-tab');
  const expensesList = document.getElementById('stats-expenses-list');
  const incomesList = document.getElementById('stats-incomes-list');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab') as 'expenses' | 'incomes';
      statsCurrentTab = tabName;

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      populateCategoryFilter(tabName);

      if (expensesList && incomesList) {
        if (tabName === 'expenses') {
          expensesList.classList.remove('hidden');
          incomesList.classList.add('hidden');
          loadStatsExpenses();
        } else {
          expensesList.classList.add('hidden');
          incomesList.classList.remove('hidden');
          loadStatsIncomes();
        }
      }
    });
  });
};

const setupStatsFilters = () => {
  const dateStart = document.getElementById('stats-filter-date-start') as HTMLInputElement;
  const dateEnd = document.getElementById('stats-filter-date-end') as HTMLInputElement;
  const category = document.getElementById('stats-filter-category') as HTMLSelectElement;
  const period = document.getElementById('stats-period-select') as HTMLSelectElement;

  const applyFilters = () => {
    updateStatsCards();
    if (statsCurrentTab === 'expenses') {
      loadStatsExpenses();
    } else {
      loadStatsIncomes();
    }
  };

  dateStart?.addEventListener('change', applyFilters);
  dateEnd?.addEventListener('change', applyFilters);
  category?.addEventListener('change', applyFilters);
  period?.addEventListener('change', applyFilters);
};

const setupStatsPeriodNavigation = () => {
  const prevBtn = document.getElementById('btn-prev-period');
  const nextBtn = document.getElementById('btn-next-period');
  const select = document.getElementById('stats-period-select') as HTMLSelectElement;

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (!select) return;
    
    const options = Array.from(select.options);
    const currentIndex = options.findIndex(o => o.value === select.value);

    if (direction === 'prev' && currentIndex > 0) {
      select.selectedIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < options.length - 1) {
      select.selectedIndex = currentIndex + 1;
    }

    updateStatsCards();
    if (statsCurrentTab === 'expenses') {
      loadStatsExpenses();
    } else {
      loadStatsIncomes();
    }
  };

  prevBtn?.addEventListener('click', () => navigatePeriod('prev'));
  nextBtn?.addEventListener('click', () => navigatePeriod('next'));
};

const setupStatsImportExport = () => {
  const exportBtn = document.getElementById('btn-export-stats');
  const importBtn = document.getElementById('btn-import-stats');
  const importFile = document.getElementById('import-file-stats') as HTMLInputElement;

  exportBtn?.addEventListener('click', () => exportData('json'));

  importBtn?.addEventListener('click', () => {
    importFile?.click();
  });

  importFile?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      await importData(file);
      loadStatsView();
      showSnackbar('Data importada correctamente', 'success');
      (e.target as HTMLInputElement).value = '';
    }
  });
};

const loadBudgetsView = () => {
  renderBudgetsList();
};

const loadProfileView = () => {
  loadUserSettings();
  loadCategoriesList();
  setupProfileTabs();
};

const loadUserSettings = () => {
  const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
  const nameInput = document.getElementById('profile-name') as HTMLInputElement;
  const emailInput = document.getElementById('profile-email') as HTMLInputElement;

  if (nameInput) nameInput.value = settings.name || '';
  if (emailInput) emailInput.value = settings.email || '';
  updateProfileAvatar(settings.name || '');
};

const updateProfileAvatar = (name: string) => {
  const avatarEl = document.getElementById('profile-avatar');
  if (!avatarEl) return;

  if (name.trim()) {
    const initial = name.charAt(0).toUpperCase();
    avatarEl.innerHTML = `<span class="profile-avatar-initial">${initial}</span>`;
    avatarEl.style.background = '#30c9e8';
  } else {
    avatarEl.innerHTML = '<span class="material-symbols-outlined">account_circle</span>';
    avatarEl.style.background = '';
  }
};

const saveUserSettings = () => {
  const nameInput = document.getElementById('profile-name') as HTMLInputElement;
  const emailInput = document.getElementById('profile-email') as HTMLInputElement;

  const settings = {
    name: nameInput?.value?.trim() || '',
    email: emailInput?.value?.trim() || ''
  };

  localStorage.setItem('userSettings', JSON.stringify(settings));
  updateProfileAvatar(settings.name);
  showSnackbar('Perfil guardado', 'success');
};

export const getCustomCategories = (): Array<{id: string; name: string; icon: string; color: string; type: 'expense' | 'income'}> => {
  return JSON.parse(localStorage.getItem('customCategories') || '[]');
};

const saveCustomCategories = (categories: Array<{id: string; name: string; icon: string; color: string; type: 'expense' | 'income'}>) => {
  localStorage.setItem('customCategories', JSON.stringify(categories));
};

const loadCategoriesList = () => {
  const container = document.getElementById('categories-list');
  if (!container) return;

  const customCategories = getCustomCategories();

  if (customCategories.length === 0) {
    container.innerHTML = `
      <div class="expense-empty">
        <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.3;">category</span>
        <p>No hay categorías personalizadas</p>
        <small>Agrega categorías para organizar tus gastos</small>
      </div>
    `;
    return;
  }

  container.innerHTML = customCategories.map(cat => `
    <div class="category-item" data-id="${cat.id}">
      <div class="category-item-left">
        <div class="category-item-icon" style="background: ${cat.color}20; color: ${cat.color};">
          <span class="material-symbols-outlined">${cat.icon}</span>
        </div>
        <span class="category-item-name">${cat.name}</span>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.category-item').forEach(item => {
    const category = customCategories.find(c => c.id === (item as HTMLElement).dataset.id);
    if (category) {
      initSwipeCategory(
        item as HTMLElement,
        category,
        (id) => editCategory(id),
        (id) => deleteCategory(id)
      );
    }
  });
};

const availableIcons = [
  'shopping_bag', 'restaurant', 'local_gas_station', 'directions_bus',
  'home', 'bolt', 'wifi', 'checkroom', 'devices', 'medication',
  'medical_services', 'smart_display', 'sports_esports', 'school',
  'build', 'account_balance', 'spa', 'cleaning_services',
  'card_giftcard', 'pets', 'flight', 'more_horiz', 'star', 'favorite',
  'music_note', 'sports_soccer', 'fitness_center', 'local_hospital',
  'school', 'work', 'savings', 'attach_money', 'credit_card'
];

const availableColors = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#30c9e8'
];

const openCategoryModal = (categoryId?: string) => {
  const overlay = document.getElementById('category-modal-overlay');
  const titleEl = document.getElementById('category-modal-title');
  const nameInput = document.getElementById('category-name') as HTMLInputElement;
  const iconInput = document.getElementById('category-icon') as HTMLInputElement;
  const colorInput = document.getElementById('category-color') as HTMLInputElement;

  const iconPicker = document.getElementById('icon-picker');
  const colorPicker = document.getElementById('color-picker');

  if (iconPicker) {
    iconPicker.innerHTML = availableIcons.map(icon => `
      <div class="icon-picker-item" data-icon="${icon}">
        <span class="material-symbols-outlined">${icon}</span>
      </div>
    `).join('');
  }

  if (colorPicker) {
    colorPicker.innerHTML = availableColors.map(color => `
      <div class="color-picker-item" data-color="${color}" style="background: ${color};"></div>
    `).join('');
  }

  if (categoryId) {
    const categories = getCustomCategories();
    const category = categories.find(c => c.id === categoryId);
    if (category && titleEl) {
      titleEl.textContent = 'Editar Categoría';
      if (nameInput) nameInput.value = category.name;
      if (iconInput) iconInput.value = category.icon;
      if (colorInput) colorInput.value = category.color;
    }
    (window as any).__editingCategoryId__ = categoryId;
  } else {
    if (titleEl) titleEl.textContent = 'Agregar Categoría';
    if (nameInput) nameInput.value = '';
    if (iconInput) iconInput.value = 'category';
    if (colorInput) colorInput.value = '#30c9e8';
    delete (window as any).__editingCategoryId__;
  }

  iconPicker?.querySelectorAll('.icon-picker-item').forEach(item => {
    item.addEventListener('click', () => {
      iconPicker.querySelectorAll('.icon-picker-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      if (iconInput) iconInput.value = item.getAttribute('data-icon') || 'category';
    });
  });

  colorPicker?.querySelectorAll('.color-picker-item').forEach(item => {
    item.addEventListener('click', () => {
      colorPicker.querySelectorAll('.color-picker-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      if (colorInput) colorInput.value = item.getAttribute('data-color') || '#30c9e8';
    });
  });

  if (overlay) overlay.classList.add('active');
};

const closeCategoryModal = () => {
  const overlay = document.getElementById('category-modal-overlay');
  if (overlay) overlay.classList.remove('active');
  delete (window as any).__editingCategoryId__;
};

const saveCategory = () => {
  const nameInput = document.getElementById('category-name') as HTMLInputElement;
  const iconInput = document.getElementById('category-icon') as HTMLInputElement;
  const colorInput = document.getElementById('category-color') as HTMLInputElement;
  const typeSelect = document.getElementById('category-type') as HTMLSelectElement;

  const name = nameInput?.value?.trim();
  const icon = iconInput?.value || 'category';
  const color = colorInput?.value || '#30c9e8';
  const type = (typeSelect?.value || 'expense') as 'expense' | 'income';

  if (!name) {
    showSnackbar('Ingresa un nombre', 'error');
    return;
  }

  const categories = getCustomCategories();
  const editingId = (window as any).__editingCategoryId__;

  if (editingId) {
    const index = categories.findIndex(c => c.id === editingId);
    if (index !== -1) {
      categories[index] = { ...categories[index], name, icon, color, type };
    }
  } else {
    categories.push({
      id: crypto.randomUUID(),
      name,
      icon,
      color,
      type
    });
  }

  saveCustomCategories(categories);
  closeCategoryModal();
  loadCategoriesList();
  loadCategorySelect();
  loadIncomeCategorySelect();
  showSnackbar(editingId ? 'Categoría actualizada' : 'Categoría creada', 'success');
};

const editCategory = (id: string) => {
  openCategoryModal(id);
};

const deleteCategory = (id: string) => {
  const categories = getCustomCategories();
  const category = categories.find(c => c.id === id);
  if (!category) return;

  const expenses = getAllExpenses();
  const incomes = getAllIncomes();
  const categoryKey = `custom_${id}`;
  
  const expensesUsingCategory = expenses.filter(e => e.category === categoryKey || e.category === id);
  const incomesUsingCategory = incomes.filter(i => i.category === categoryKey || i.category === id);
  const totalUsage = expensesUsingCategory.length + incomesUsingCategory.length;

  if (totalUsage > 0) {
    const expenseCount = expensesUsingCategory.length;
    const incomeCount = incomesUsingCategory.length;
    let usageText = '';
    if (expenseCount > 0 && incomeCount > 0) {
      usageText = `Está siendo usada en ${expenseCount} gasto(s) y ${incomeCount} ingreso(s)`;
    } else if (expenseCount > 0) {
      usageText = `Está siendo usada en ${expenseCount} gasto(s)`;
    } else {
      usageText = `Está siendo usada en ${incomeCount} ingreso(s)`;
    }

    const overlay = document.createElement('div');
    overlay.className = 'confirm-popup-overlay';
    overlay.innerHTML = `
      <div class="confirm-popup">
        <div class="confirm-popup-icon" style="color: #ef4444;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h3 class="confirm-popup-title">No se puede eliminar</h3>
        <p class="confirm-popup-message">La categoría <strong>${category.name}</strong> no se puede eliminar porque ${usageText}.</p>
        <div class="confirm-popup-buttons">
          <button class="confirm-popup-btn" data-ok>Aceptar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector('[data-ok]')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'confirm-popup-overlay';
  overlay.innerHTML = `
    <div class="confirm-popup">
      <div class="confirm-popup-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <h3 class="confirm-popup-title">Eliminar Categoría</h3>
      <p class="confirm-popup-message">¿Estás seguro de eliminar la categoría <strong>${category.name}</strong>?</p>
      <div class="confirm-popup-buttons">
        <button class="confirm-popup-btn cancel" data-cancel>Cancelar</button>
        <button class="confirm-popup-btn danger" data-confirm>Eliminar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const cleanup = () => {
    overlay.remove();
  };

  const handleConfirm = () => {
    cleanup();
    const updatedCategories = getCustomCategories().filter(c => c.id !== id);
    saveCustomCategories(updatedCategories);
    loadCategoriesList();
    loadCategorySelect();
    loadIncomeCategorySelect();
    showSnackbar('Categoría eliminada', 'success');
  };

  overlay.querySelector('[data-cancel]')?.addEventListener('click', cleanup);
  overlay.querySelector('[data-confirm]')?.addEventListener('click', handleConfirm);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cleanup();
  });
};

const setupProfileTabs = () => {
  const tabs = document.querySelectorAll('.profile-tab');
  const userSection = document.getElementById('profile-user-section');
  const categoriesSection = document.getElementById('profile-categories-section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (tabName === 'user' && userSection && categoriesSection) {
        userSection.classList.remove('hidden');
        categoriesSection.classList.add('hidden');
      } else if (tabName === 'categories' && userSection && categoriesSection) {
        userSection.classList.add('hidden');
        categoriesSection.classList.remove('hidden');
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
    salary: 'payments',
    freelance: 'laptop_mac',
    bonus: 'stars',
    investment: 'trending_up',
    gift: 'card_giftcard',
    other_income: 'attach_money',
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

const openBottomSheet = () => {
  const overlay = document.getElementById('bottom-sheet-overlay');
  if (overlay) overlay.classList.add('active');
};

const closeBottomSheet = () => {
  const overlay = document.getElementById('bottom-sheet-overlay');
  if (overlay) overlay.classList.remove('active');
  clearExpenseForm();
};

const openIncomeSheet = () => {
  const overlay = document.getElementById('income-sheet-overlay');
  const amountInput = document.getElementById('income-amount') as HTMLInputElement;
  const detailInput = document.getElementById('income-detail') as HTMLTextAreaElement;
  const categorySelect = document.getElementById('income-category') as HTMLSelectElement;
  const dateInput = document.getElementById('income-date') as HTMLInputElement;
  
  if (amountInput) amountInput.value = '';
  if (detailInput) detailInput.value = '';
  if (categorySelect) categorySelect.value = '';
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  if (overlay) overlay.classList.add('active');
};

const closeIncomeSheet = () => {
  const overlay = document.getElementById('income-sheet-overlay');
  const amountInput = document.getElementById('income-amount') as HTMLInputElement;
  const detailInput = document.getElementById('income-detail') as HTMLTextAreaElement;
  
  if (overlay) overlay.classList.remove('active');
  if (amountInput) amountInput.value = '';
  if (detailInput) detailInput.value = '';
};

const handleSaveIncome = () => {
  const amountInput = document.getElementById('income-amount') as HTMLInputElement;
  const detailInput = document.getElementById('income-detail') as HTMLTextAreaElement;
  const categorySelect = document.getElementById('income-category') as HTMLSelectElement;
  const dateInput = document.getElementById('income-date') as HTMLInputElement;
  const titleEl = document.querySelector('#income-sheet-overlay .bottom-sheet-title');

  const amount = parseFloat(amountInput?.value || '0');
  const detail = detailInput?.value?.trim() || '';
  const category = categorySelect?.value as IncomeCategory;
  const date = dateInput?.value || new Date().toISOString().split('T')[0];

  if (!amount || amount <= 0) {
    showSnackbar('Ingresa un monto válido', 'error');
    return;
  }

  if (!category) {
    showSnackbar('Selecciona una fuente de ingreso', 'error');
    return;
  }

  const incomes = getAllIncomes();
  const editingId = (window as any).__editingIncomeId__;

  if (editingId) {
    const index = incomes.findIndex(i => i.id === editingId);
    if (index !== -1) {
      incomes[index] = {
        ...incomes[index],
        amount,
        category,
        detail,
        date: new Date(date).toISOString()
      };
      localStorage.setItem('incomes', JSON.stringify(incomes));
      delete (window as any).__editingIncomeId__;
      closeIncomeSheet();
      loadHomeView();
      if (currentView === 'stats') {
        updateStatsCards();
        if (statsCurrentTab === 'incomes') {
          loadStatsIncomes();
        }
      }
      showSnackbar('Ingreso actualizado', 'success');
      if (titleEl) titleEl.textContent = 'Agregar Ingreso';
      return;
    }
  }

  const newIncome = {
    id: crypto.randomUUID(),
    amount,
    category,
    detail,
    date: new Date(date).toISOString()
  };

  incomes.unshift(newIncome);
  localStorage.setItem('incomes', JSON.stringify(incomes));

  closeIncomeSheet();
  loadHomeView();
  if (currentView === 'stats') {
    updateStatsCards();
    if (statsCurrentTab === 'incomes') {
      loadStatsIncomes();
    }
  }
  showSnackbar('Ingreso guardado', 'success');
  if (titleEl) titleEl.textContent = 'Agregar Ingreso';
};

// Radial Menu Logic
let isRadialMenuOpen = false;
let dragStartX = 0;
let dragStartY = 0;
let currentHoveredOption: string | null = null;

const initRadialMenu = () => {
  const fab = document.getElementById('radial-menu-fab') as HTMLElement;
  const backdrop = document.getElementById('radial-menu-backdrop');
  const expenseOption = document.getElementById('radial-option-expense') as HTMLElement;
  const incomeOption = document.getElementById('radial-option-income') as HTMLElement;
  const budgetOption = document.getElementById('radial-option-budget') as HTMLElement;
  const radialOptions = document.querySelector('.radial-menu-options') as HTMLElement;

  if (!fab || !backdrop) return;

  const showRadialMenu = () => {
    isRadialMenuOpen = true;
    fab.classList.add('menu-active');
    backdrop.classList.add('active');
    radialOptions?.classList.add('active');
    expenseOption?.classList.add('active');
    incomeOption?.classList.add('active');
    budgetOption?.classList.add('active');
  };

  const hideRadialMenu = () => {
    isRadialMenuOpen = false;
    currentHoveredOption = null;
    fab.classList.remove('menu-active', 'dragging');
    backdrop.classList.remove('active');
    radialOptions?.classList.remove('active');
    expenseOption?.classList.remove('active', 'selected');
    incomeOption?.classList.remove('active', 'selected');
    budgetOption?.classList.remove('active', 'selected');
  };

  const getTouchPosition = (e: TouchEvent | MouseEvent): { x: number; y: number } => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if ('changedTouches' in e && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  };

  const getSelectedOptionByAngle = (angle: number): string | null => {
    if (angle >= 225 && angle <= 315) {
      return 'budget';
    } else if (angle > 315 || angle < 45) {
      return 'income';
    } else if (angle >= 45 && angle <= 225) {
      return 'expense';
    }
    return null;
  };

  const highlightOption = (option: string | null) => {
    expenseOption?.classList.toggle('selected', option === 'expense');
    incomeOption?.classList.toggle('selected', option === 'income');
    budgetOption?.classList.toggle('selected', option === 'budget');
    currentHoveredOption = option;
  };

  const clearHighlight = () => {
    expenseOption?.classList.remove('selected');
    incomeOption?.classList.remove('selected');
    budgetOption?.classList.remove('selected');
  };

  const handleStart = (e: TouchEvent | MouseEvent) => {
    e.preventDefault();
    const pos = getTouchPosition(e);
    dragStartX = pos.x;
    dragStartY = pos.y;
    currentHoveredOption = null;
    fab.classList.add('dragging');
    showRadialMenu();
  };

  const handleMove = (e: TouchEvent | MouseEvent) => {
    if (!fab.classList.contains('dragging') || !isRadialMenuOpen) return;
    
    e.preventDefault();
    const pos = getTouchPosition(e);
    const deltaX = pos.x - dragStartX;
    const deltaY = pos.y - dragStartY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > 10) {
      const angle = Math.atan2(-deltaY, deltaX) * (180 / Math.PI);
      const normalizedAngle = angle < 0 ? angle + 360 : angle;
      const selectedOption = getSelectedOptionByAngle(normalizedAngle);
      highlightOption(selectedOption);
    } else {
      clearHighlight();
    }
  };

  const handleEnd = (e: TouchEvent | MouseEvent) => {
    fab.classList.remove('dragging');
    
    if (!isRadialMenuOpen) {
      return;
    }

    e.preventDefault();
    
    let selectedAction: string | null = currentHoveredOption;
    
    if (!selectedAction) {
      const pos = getTouchPosition(e);
      const deltaX = pos.x - dragStartX;
      const deltaY = pos.y - dragStartY;
      const angle = Math.atan2(-deltaY, deltaX) * (180 / Math.PI);
      const normalizedAngle = angle < 0 ? angle + 360 : angle;
      selectedAction = getSelectedOptionByAngle(normalizedAngle);
    }

    hideRadialMenu();

    if (selectedAction === 'expense') {
      openBottomSheet();
    } else if (selectedAction === 'income') {
      openIncomeSheet();
    } else if (selectedAction === 'budget') {
      openBudgetConfigModal();
    }
  };

  fab.addEventListener('touchstart', handleStart, { passive: false });
  fab.addEventListener('touchmove', handleMove, { passive: false });
  fab.addEventListener('touchend', handleEnd, { passive: false });
  fab.addEventListener('touchcancel', hideRadialMenu);

  fab.addEventListener('mousedown', handleStart);
  document.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleEnd);

  backdrop.addEventListener('click', hideRadialMenu);
  backdrop.addEventListener('touchend', hideRadialMenu);
};

const clearExpenseForm = () => {
  const amountInput = document.getElementById('expense-amount') as HTMLInputElement;
  const detailInput = document.getElementById('expense-detail') as HTMLTextAreaElement;
  const dateInput = document.getElementById('expense-date') as HTMLInputElement;
  const categorySelect = document.getElementById('expense-category') as HTMLSelectElement;
  const titleEl = document.querySelector('.bottom-sheet-title');

  if (amountInput) amountInput.value = '';
  if (detailInput) detailInput.value = '';
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  if (categorySelect) categorySelect.value = '';
  if (titleEl) titleEl.textContent = 'Agregar Gasto';
  delete (window as any).__editingExpenseId__;
};

const loadCategorySelect = () => {
  const select = document.getElementById('expense-category') as HTMLSelectElement;
  const budgetSelect = document.getElementById('budget-category') as HTMLSelectElement;
  const customCategories = getCustomCategories();
  const customExpenseCategories = customCategories.filter(c => c.type === 'expense');

  if (select) {
    const defaultOptions = Object.entries(expenseGroups)
      .map(([key, group]) => `<option value="${key}">${group.label}</option>`)
      .join('');
    const customOptions = customExpenseCategories
      .map(cat => `<option value="custom_${cat.id}">${cat.name} (Personalizado)</option>`)
      .join('');
    select.innerHTML = defaultOptions + customOptions;
  }

  // Budget select is no longer used for manual budget entry
  if (budgetSelect) {
    budgetSelect.innerHTML = '';
  }

  loadQuickCategories();
};

const loadIncomeCategorySelect = () => {
  const select = document.getElementById('income-category') as HTMLSelectElement;
  const customCategories = getCustomCategories();
  const customIncomeCategories = customCategories.filter(c => c.type === 'income');

  if (select) {
    const defaultOptions = Object.entries(incomeCategories)
      .map(([key, cat]) => `<option value="${key}">${cat.label}</option>`)
      .join('');
    const customOptions = customIncomeCategories
      .map(cat => `<option value="custom_${cat.id}">${cat.name} (Personalizado)</option>`)
      .join('');
    select.innerHTML = '<option value="">Selecciona una opción</option>' + defaultOptions + customOptions;
  }
};

const loadQuickCategories = () => {
  const container = document.getElementById('quick-categories');
  if (!container) return;

  const topCategories: ExpenseGroup[] = ['needs', 'wants', 'savings'];

  container.innerHTML = topCategories.map(cat => {
    const c = expenseGroups[cat];
    return `
      <div class="quick-category" data-category="${cat}" style="border-color: ${c?.color}30;">
        <span class="material-symbols-outlined" style="font-size: 18px;">${c?.icon}</span>
        <span>${c?.label}</span>
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
  const category = categorySelect?.value as ExpenseGroup;
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
  const editingId = (window as any).__editingExpenseId__;

  if (editingId) {
    const index = expenses.findIndex(e => e.id === editingId);
    if (index !== -1) {
      expenses[index] = {
        ...expenses[index],
        amount,
        category,
        detail,
        date: new Date(date).toISOString()
      };
      localStorage.setItem('expenses', JSON.stringify(expenses));
      localStorage.setItem('filteredExpenses', JSON.stringify(expenses));
      delete (window as any).__editingExpenseId__;
      closeBottomSheet();
      loadHomeView();
      showSnackbar('Gasto actualizado', 'success');
      return;
    }
  }

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

function setupEventListeners() {
  document.querySelectorAll('.bottom-nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-view');
      if (view) showView(view);
    });
  });

  document.getElementById('fab-add')?.addEventListener('click', () => {
    if (currentView === 'budgets') {
      openBudgetConfigModal();
    } else {
      openBottomSheet();
    }
  });
  document.getElementById('btn-close-sheet')?.addEventListener('click', closeBottomSheet);
  document.getElementById('bottom-sheet-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeBottomSheet();
  });
  
  document.getElementById('btn-close-budget-sheet')?.addEventListener('click', closeBudgetConfigModal);
  document.getElementById('budget-sheet-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeBudgetConfigModal();
  });

  // Budget config inputs - update preview on change
  document.getElementById('budget-needs-percent')?.addEventListener('input', updateBudgetPreview);
  document.getElementById('budget-wants-percent')?.addEventListener('input', updateBudgetPreview);
  document.getElementById('budget-savings-percent')?.addEventListener('input', updateBudgetPreview);

  document.getElementById('btn-save-expense')?.addEventListener('click', handleSaveExpense);
  document.getElementById('btn-save-budget-config')?.addEventListener('click', handleBudgetConfigSave);
  document.getElementById('btn-save-income')?.addEventListener('click', handleSaveIncome);

  document.getElementById('btn-close-income-sheet')?.addEventListener('click', closeIncomeSheet);
  document.getElementById('income-sheet-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeIncomeSheet();
  });

  document.getElementById('btn-see-all')?.addEventListener('click', () => showView('stats'));

  document.getElementById('btn-back-stats')?.addEventListener('click', () => showView('home'));
  document.getElementById('btn-back-budgets')?.addEventListener('click', () => showView('home'));
  document.getElementById('btn-back-profile')?.addEventListener('click', () => showView('home'));

  document.getElementById('btn-save-profile')?.addEventListener('click', saveUserSettings);

  document.getElementById('btn-add-category')?.addEventListener('click', () => openCategoryModal());
  document.getElementById('btn-close-category-modal')?.addEventListener('click', closeCategoryModal);
  document.getElementById('category-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCategoryModal();
  });
  document.getElementById('btn-save-category')?.addEventListener('click', saveCategory);

  document.getElementById('alert-adjust')?.addEventListener('click', () => showView('budgets'));
}

window.addEventListener('incomeDeleted', () => {
  loadHomeView();
  if (currentView === 'stats') {
    updateStatsCards();
    if (statsCurrentTab === 'expenses') {
      loadStatsExpenses();
    } else {
      loadStatsIncomes();
    }
  }
});

window.addEventListener('expenseDeleted', () => {
  loadHomeView();
  if (currentView === 'stats') {
    updateStatsCards();
    if (statsCurrentTab === 'expenses') {
      loadStatsExpenses();
    } else {
      loadStatsIncomes();
    }
  }
});

window.addEventListener('budgetDeleted', () => {
  loadHomeView();
  if (currentView === 'budgets') {
    renderBudgetsList();
  }
});

const MIGRATION_KEY = 'hasMigratedTo503020';

const runMigration = () => {
  const hasMigrated = localStorage.getItem(MIGRATION_KEY);
  
  if (!hasMigrated) {
    localStorage.removeItem('expenses');
    localStorage.removeItem('filteredExpenses');
    localStorage.removeItem('budgets');
    
    const customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
    const filteredCategories = customCategories.filter((c: { type: string }) => c.type !== 'expense');
    localStorage.setItem('customCategories', JSON.stringify(filteredCategories));
    
    localStorage.setItem(MIGRATION_KEY, 'true');
  }
};

async function initApp() {
  runMigration();
  
  loadCategorySelect();
  loadIncomeCategorySelect();
  clearExpenseForm();
  setupEventListeners();
  initRadialMenu();
  initViewSwipe();
  loadHomeView();
  checkBudgetAlertsOnLoad();
}

initApp();
