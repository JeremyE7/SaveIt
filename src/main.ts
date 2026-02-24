import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { loadExpenses } from "./dom/htmlElements";
import { getAllExpenses, confirmDeleteExpense, setExpenseToEdit } from "./features/expenses";
import { getAllIncomes } from "./features/incomes";
import { checkBudgetAlertsOnLoad, renderBudgetsList } from "./features/budgetModal";
import { getCurrentMonthTotal, getCurrentMonthExpenses, getCategoryDistribution, getCurrentMonthIncomeTotal, getExpensesByMonth, getIncomesByMonth, getMonthTotal, getIncomeMonthTotal, getAllExpensesTotal, getAllIncomesTotal } from "./utils/general";
import { categories, type Category } from "./types/Categories";
import { generatePieChart } from "./features/graphs";
import { initSwipeExpense, initSwipeIncome, openEditModal, openEditIncomeModal } from "./utils/swipe";
import { exportData, importData } from "./features/importExport";
import { confirmDeleteIncome } from "./features/incomes";
import type { Expense } from "./types/Expense";
import type { Income } from "./types/Income";

registerSW({ immediate: false });

let currentView = 'home';

const viewOrder: Record<string, number> = {
  home: 0,
  stats: 1,
  budgets: 2
};

const showView = (viewName: string) => {
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

    const views = ['home-view', 'stats-view', 'budgets-view'];
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

  if (type === 'expenses') {
    options = Object.entries(categories)
      .map(([key, cat]) => `<option value="${key}">${cat.label}</option>`)
      .join('');
  } else {
    const incomeSources = [
      { value: 'salary', label: 'Sueldo' },
      { value: 'freelance', label: 'Freelance' },
      { value: 'bonus', label: 'Bonificación' },
      { value: 'investment', label: 'Inversiones' },
      { value: 'gift', label: 'Regalo' },
      { value: 'other_income', label: 'Otro' },
    ];
    options = incomeSources
      .map(s => `<option value="${s.value}">${s.label}</option>`)
      .join('');
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
      const cat = categories[expense.category as Category];
      const catColor = cat?.color || '#666';
      return `
        <div class="expense-item" data-id="${expense.id}">
          <div class="expense-item-left">
            <div class="expense-item-icon" style="background: ${catColor}20; color: ${catColor};">
              <span class="material-symbols-outlined" style="font-size: 20px;">${getCategoryIcon(expense.category)}</span>
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
      const cat = categories[income.category as Category];
      const catColor = cat?.color || '#22c55e';
      return `
        <div class="expense-item" data-id="${income.id}">
          <div class="expense-item-left">
            <div class="expense-item-icon" style="background: ${catColor}20; color: ${catColor};">
              <span class="material-symbols-outlined" style="font-size: 20px;">${getCategoryIcon(income.category)}</span>
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

const openBottomSheet = () => {
  const overlay = document.getElementById('bottom-sheet-overlay');
  if (overlay) overlay.classList.add('active');
};

const closeBottomSheet = () => {
  const overlay = document.getElementById('bottom-sheet-overlay');
  if (overlay) overlay.classList.remove('active');
  clearExpenseForm();
};

const openBudgetSheet = () => {
  const overlay = document.getElementById('budget-sheet-overlay');
  const amountInput = document.getElementById('budget-amount') as HTMLInputElement;
  const categorySelect = document.getElementById('budget-category') as HTMLSelectElement;
  
  if (amountInput) amountInput.value = '';
  if (categorySelect) categorySelect.value = '';
  if (overlay) overlay.classList.add('active');
};

const closeBudgetSheet = () => {
  const overlay = document.getElementById('budget-sheet-overlay');
  const amountInput = document.getElementById('budget-amount') as HTMLInputElement;
  
  if (overlay) overlay.classList.remove('active');
  if (amountInput) amountInput.value = '';
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
  const category = categorySelect?.value as Category;
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
      openBudgetSheet();
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

  closeBudgetSheet();
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

  document.getElementById('fab-add')?.addEventListener('click', () => {
    if (currentView === 'budgets') {
      openBudgetSheet();
    } else {
      openBottomSheet();
    }
  });
  document.getElementById('btn-close-sheet')?.addEventListener('click', closeBottomSheet);
  document.getElementById('bottom-sheet-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeBottomSheet();
  });
  
  document.getElementById('btn-close-budget-sheet')?.addEventListener('click', closeBudgetSheet);
  document.getElementById('budget-sheet-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeBudgetSheet();
  });

  document.getElementById('btn-save-expense')?.addEventListener('click', handleSaveExpense);
  document.getElementById('btn-save-budget')?.addEventListener('click', handleSaveBudget);
  document.getElementById('btn-save-income')?.addEventListener('click', handleSaveIncome);

  document.getElementById('btn-close-income-sheet')?.addEventListener('click', closeIncomeSheet);
  document.getElementById('income-sheet-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeIncomeSheet();
  });

  document.getElementById('btn-see-all')?.addEventListener('click', () => showView('stats'));

  document.getElementById('btn-back-stats')?.addEventListener('click', () => showView('home'));
  document.getElementById('btn-back-budgets')?.addEventListener('click', () => showView('home'));

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

async function initApp() {
  loadCategorySelect();
  clearExpenseForm();
  setupEventListeners();
  initRadialMenu();
  loadHomeView();
  checkBudgetAlertsOnLoad();
}

initApp();
