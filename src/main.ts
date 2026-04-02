import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { loadExpenses } from "./dom/htmlElements";
import { getAllExpenses, confirmDeleteExpense, setExpenseToEdit } from "./features/expenses";
import { getAllIncomes } from "./features/incomes";
import { checkBudgetAlertsOnLoad, renderBudgetsList, openBudgetConfigModal, closeBudgetConfigModal, handleBudgetConfigSave, updateBudgetPreview } from "./features/budgetModal";
import { getCurrentMonthTotal, getCategoryDistribution, getCurrentMonthIncomeTotal, getExpensesByMonth, getIncomesByMonth, getMonthTotal, getIncomeMonthTotal, getAllExpensesTotal, getAllIncomesTotal, getTodayLocalInputDateValue } from "./utils/general";
import { expenseGroups, type ExpenseGroup } from "./types/ExpenseGroups";
import { incomeCategories, type IncomeCategory } from "./types/IncomeCategories";
import { initSwipeExpense, initSwipeIncome, initSwipeCategory, initSwipeSubscription, openEditModal, openEditIncomeModal } from "./utils/swipe";
import { exportData, importData } from "./features/importExport";
import { confirmDeleteIncome } from "./features/incomes";
import { confirmDeleteSubscription, getAllSubscriptions, getNextChargeDate, getNotificationPermissionState, getOneSignalSubscriptionState, processSubscriptionsForToday, requestSubscriptionNotificationPermission, toggleSubscriptionStatus, upsertSubscription } from "./features/subscriptions";
import { clearTrackedLocalData, initializeFirestoreSync } from "./features/firestoreSync";
import { changeCurrentUserPassword, loginWithEmailPassword, logoutCurrentUser, registerWithEmailPassword, subscribeAuthState } from "./features/auth";
import { getNotificationCenterItems, getNotificationUnreadCount, markAllNotificationsAsRead } from "./features/notifications";
import type { Expense } from "./types/Expense";
import type { Income } from "./types/Income";
import type { Subscription } from "./types/Subscription";
import type { User } from "firebase/auth";

registerSW({ immediate: false });

let currentView = 'home';
let currentAuthUser: User | null = null;
let lastAuthUid: string | null = null;

const syncOneSignalIdentity = async (user: User | null): Promise<void> => {
  if (typeof window === 'undefined') return;

  const applyIdentity = async (oneSignal: any) => {
    try {
      if (user) {
        if (typeof oneSignal.login === 'function') {
          await oneSignal.login(user.uid);
        }
      }
    } catch {
      // noop: OneSignal no debe romper flujo auth
    }
  };

  const deferred = (window as any).OneSignalDeferred;
  if (Array.isArray(deferred)) {
    deferred.push((oneSignal: any) => applyIdentity(oneSignal));
    return;
  }

  const oneSignal = (window as any).OneSignal;
  if (oneSignal) {
    await applyIdentity(oneSignal);
  }
};

const clearOneSignalIdentity = async (): Promise<void> => {
  if (typeof window === 'undefined') return;

  const runLogout = async (oneSignal: any) => {
    try {
      if (typeof oneSignal?.logout === 'function') {
        await oneSignal.logout();
      }
    } catch {
      // noop
    }
  };

  const deferred = (window as any).OneSignalDeferred;
  if (Array.isArray(deferred)) {
    deferred.push((oneSignal: any) => runLogout(oneSignal));
    return;
  }

  const oneSignal = (window as any).OneSignal;
  if (oneSignal) {
    await runLogout(oneSignal);
  }
};

const viewOrder: Record<string, number> = {
  home: 0,
  stats: 1,
  subscriptions: 2,
  budgets: 3,
  profile: 4
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
    const isOnItem = target.closest('.expense-item, .budget-item, .category-item');
    
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

  const resetScrollPositionSmooth = (targetView?: HTMLElement | null) => {
    const appContainer = document.querySelector('.app-container') as HTMLElement | null;

    targetView?.scrollTo({ top: 0, behavior: 'smooth' });
    appContainer?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentIndex = viewOrder[currentView] || 0;
  const newIndex = viewOrder[viewName] || 0;
  const direction = newIndex > currentIndex ? 'forward' : 'backward';

  const currentEl = document.getElementById(currentView + '-view');
  const newEl = document.getElementById(viewName + '-view');

  // reset silencioso en la vista destino (aún oculta)
  if (newEl) newEl.scrollTop = 0;

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

    const views = ['home-view', 'stats-view', 'subscriptions-view', 'budgets-view', 'profile-view'];
    views.forEach(view => {
      const el = document.getElementById(view);
      if (el) {
        el.classList.toggle('view-hidden', view !== viewName + '-view');
      }
    });

    currentView = viewName;

    // reset suave al entrar a la nueva vista
    resetScrollPositionSmooth(newEl);
    requestAnimationFrame(() => resetScrollPositionSmooth(newEl));
  }, 300);

  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    }
  });

  if (viewName === 'stats') {
    loadStatsView();
  } else if (viewName === 'subscriptions') {
    loadSubscriptionsView();
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
  const trendTextEl = document.getElementById('home-balance-trend-text');
  const incomeProgressEl = document.getElementById('income-progress-bar') as HTMLElement;
  const expenseProgressEl = document.getElementById('expense-progress-bar') as HTMLElement;

  if (incomeEl) incomeEl.textContent = `$${totalIncome.toFixed(2)}`;
  if (spentEl) spentEl.textContent = `$${totalSpent.toFixed(2)}`;
  if (balanceEl) {
    const balanceValue = balance >= 0 ? `+$${balance.toFixed(2)}` : `-$${Math.abs(balance).toFixed(2)}`;
    balanceEl.textContent = balanceValue;
    balanceEl.className = balance >= 0 ? 'home-balance-value' : 'home-balance-value negative';
  }

  if (trendTextEl) {
    trendTextEl.textContent = balance >= 0 ? 'En control este mes' : 'Revisa tus gastos del mes';
  }

  if (incomeProgressEl && expenseProgressEl) {
    const base = Math.max(totalIncome, totalSpent, 1);
    const incomePct = Math.min((totalIncome / base) * 100, 100);
    const expensePct = Math.min((totalSpent / base) * 100, 100);
    incomeProgressEl.style.width = `${incomePct}%`;
    expenseProgressEl.style.width = `${expensePct}%`;
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
    avatarEl.style.background = 'rgba(0, 229, 255, 0.24)';
  } else if (avatarEl) {
    avatarEl.innerHTML = '<span class="material-symbols-outlined">account_circle</span>';
    avatarEl.style.background = '';
  }

  loadExpenses();
  renderCategoryBar();
  updateNotificationBell();
};

let statsSelectedYear: number;
let statsSelectedMonth: number;
let statsCurrentTab: 'expenses' | 'incomes' = 'expenses';
let statsRangeMode: 'all' | 'month' | 'year' = 'month';
let subscriptionsFilter: 'all' | ExpenseGroup = 'all';

const getMonthName = (month: number): string => {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return months[month];
};

const formatMoney = (value: number): string => `$${value.toFixed(2)}`;

const formatStatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
};

const hexToRgba = (hex: string, alpha: number): string => {
  const sanitized = hex.replace('#', '').trim();
  if (![3, 6].includes(sanitized.length)) return `rgba(132, 147, 150, ${alpha})`;
  const normalized = sanitized.length === 3
    ? sanitized.split('').map((char) => `${char}${char}`).join('')
    : sanitized;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getStatsCategoryMeta = (category: string, type: 'expenses' | 'incomes'): { label: string; color: string } => {
  if (category.startsWith('custom_')) {
    const categoryId = category.replace('custom_', '');
    const customCategories = getCustomCategories();
    const customCat = customCategories.find((c) => c.id === categoryId && c.type === (type === 'expenses' ? 'expense' : 'income'));
    if (customCat) return { label: customCat.name, color: customCat.color };
  }

  if (type === 'expenses') {
    const group = expenseGroups[category as ExpenseGroup];
    return {
      label: group?.label || category,
      color: group?.color || '#849396',
    };
  }

  const income = incomeCategories[category as IncomeCategory];
  return {
    label: income?.label || category,
    color: income?.color || '#849396',
  };
};

const getAvailableStatsYears = (): number[] => {
  const allDates = [...getAllExpenses().map((e) => e.date), ...getAllIncomes().map((i) => i.date)];
  const years = new Set<number>();

  allDates.forEach((dateValue) => {
    const parsed = new Date(dateValue);
    if (!Number.isNaN(parsed.getTime())) {
      years.add(parsed.getFullYear());
    }
  });

  years.add(new Date().getFullYear());

  return Array.from(years).sort((a, b) => b - a);
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
    const endMonth = 0;

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
  const statsAvatarEl = document.getElementById('stats-header-avatar');
  const username = (localStorage.getItem('username') || 'SaveIt').trim();
  statsSelectedYear = now.getFullYear();
  statsSelectedMonth = now.getMonth();
  statsCurrentTab = 'expenses';
  statsRangeMode = 'month';

  if (statsAvatarEl) {
    statsAvatarEl.textContent = username ? username.charAt(0).toUpperCase() : '$';
  }

  populatePeriodSelect();
  populateCategoryFilter();
  setupStatsRangeToggle();
  applyStatsRangeMode(statsRangeMode);
  updateStatsCards();
  loadStatsExpenses();
  renderStatsDistribution();
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

  const incomeEl = document.getElementById('stats-total-income');
  const spentEl = document.getElementById('stats-total-spent');
  const balanceEl = document.getElementById('stats-balance');
  const spentTrendEl = document.getElementById('stats-spent-trend');
  const incomeTrendEl = document.getElementById('stats-income-trend');

  let previousIncome = 0;
  let previousSpent = 0;

  if (value && value !== 'all') {
    const [year, month] = value.split('-').map(Number);
    const prevDate = new Date(year, month - 1, 1);
    previousIncome = getIncomeMonthTotal(prevDate.getFullYear(), prevDate.getMonth());
    previousSpent = getMonthTotal(prevDate.getFullYear(), prevDate.getMonth());
  } else {
    const now = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    previousIncome = getIncomeMonthTotal(prevDate.getFullYear(), prevDate.getMonth());
    previousSpent = getMonthTotal(prevDate.getFullYear(), prevDate.getMonth());
  }

  const incomeDelta = previousIncome > 0 ? ((totalIncome - previousIncome) / previousIncome) * 100 : 0;
  const spentDelta = previousSpent > 0 ? ((totalSpent - previousSpent) / previousSpent) * 100 : 0;

  if (incomeEl) incomeEl.textContent = formatMoney(totalIncome);
  if (spentEl) spentEl.textContent = formatMoney(totalSpent);
  if (balanceEl) {
    const balance = totalIncome - totalSpent;
    balanceEl.textContent = balance >= 0 ? `+$${balance.toFixed(2)}` : `-$${Math.abs(balance).toFixed(2)}`;
    balanceEl.className = balance >= 0 ? 'stat-card-value income' : 'stat-card-value expense';
  }

  if (spentTrendEl) spentTrendEl.textContent = `${Math.abs(spentDelta).toFixed(0)}% vs mes ant.`;
  if (incomeTrendEl) incomeTrendEl.textContent = `${Math.abs(incomeDelta).toFixed(0)}% vs mes ant.`;
};

const populateCategoryFilter = (type: 'expenses' | 'incomes' = 'expenses') => {
  const select = document.getElementById('stats-filter-category') as HTMLSelectElement;
  if (!select) return;

  let options = '';
  const customCategories = getCustomCategories();

  if (type === 'expenses') {
    const subscriptionOption = '<option value="__subscription__">Suscripciones</option>';
    const defaultOptions = Object.entries(expenseGroups)
      .map(([key, group]) => `<option value="${key}">${group.label}</option>`)
      .join('');
    const customOptions = customCategories.filter(c => c.type === 'expense')
      .map(cat => `<option value="custom_${cat.id}">${cat.name} (Personalizado)</option>`)
      .join('');
    options = subscriptionOption + defaultOptions + customOptions;
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

const updateStatsControlLabels = () => {
  const periodChipLabel = document.getElementById('stats-period-chip-label');
  const periodChip = document.getElementById('stats-period-chip');
  const periodSelect = document.getElementById('stats-period-select') as HTMLSelectElement;
  const prevBtn = document.getElementById('btn-prev-period') as HTMLButtonElement;
  const nextBtn = document.getElementById('btn-next-period') as HTMLButtonElement;

  if (periodChipLabel && periodSelect) {
    if (statsRangeMode === 'all') {
      periodChipLabel.textContent = 'Todo el historial';
    } else if (statsRangeMode === 'year') {
      periodChipLabel.textContent = `Año ${statsSelectedYear}`;
    } else {
      const [year, month] = periodSelect.value?.split('-').map(Number) || [new Date().getFullYear(), new Date().getMonth()];
      periodChipLabel.textContent = `${getMonthName(month)} ${year}`;
    }
  }

  if (periodChip) {
    periodChip.classList.toggle('active', statsRangeMode !== 'month');
  }

  if (prevBtn && nextBtn && periodSelect) {
    if (statsRangeMode === 'month') {
      const monthOptions = Array.from(periodSelect.options).filter((o) => o.value !== 'all');
      const currentMonthIndex = monthOptions.findIndex((o) => o.value === periodSelect.value);
      prevBtn.disabled = currentMonthIndex >= monthOptions.length - 1;
      nextBtn.disabled = currentMonthIndex <= 0;
    } else if (statsRangeMode === 'year') {
      const years = getAvailableStatsYears();
      const currentIndex = years.findIndex((year) => year === statsSelectedYear);
      prevBtn.disabled = currentIndex >= years.length - 1;
      nextBtn.disabled = currentIndex <= 0;
    } else {
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    }
  }

  const rangeButtons = [
    { id: 'stats-range-all', mode: 'all' },
    { id: 'stats-range-month', mode: 'month' },
    { id: 'stats-range-year', mode: 'year' },
  ] as const;

  rangeButtons.forEach((entry) => {
    const button = document.getElementById(entry.id);
    if (!button) return;
    button.classList.toggle('active', statsRangeMode === entry.mode);
  });
};

const applyStatsRangeMode = (mode: 'all' | 'month' | 'year') => {
  statsRangeMode = mode;

  const periodSelect = document.getElementById('stats-period-select') as HTMLSelectElement;
  const dateStart = document.getElementById('stats-filter-date-start') as HTMLInputElement;
  const dateEnd = document.getElementById('stats-filter-date-end') as HTMLInputElement;
  const now = new Date();

  if (!periodSelect || !dateStart || !dateEnd) return;

  if (mode === 'all') {
    periodSelect.value = 'all';
    dateStart.value = '';
    dateEnd.value = '';
  } else if (mode === 'year') {
    statsSelectedYear = now.getFullYear();
    periodSelect.value = 'all';
    dateStart.value = `${statsSelectedYear}-01-01`;
    dateEnd.value = `${statsSelectedYear}-12-31`;
  } else {
    periodSelect.value = `${now.getFullYear()}-${now.getMonth()}`;
    dateStart.value = '';
    dateEnd.value = '';
  }

  updateStatsControlLabels();
};

const setupStatsRangeToggle = () => {
  const allBtn = document.getElementById('stats-range-all');
  const monthBtn = document.getElementById('stats-range-month');
  const yearBtn = document.getElementById('stats-range-year');

  allBtn?.addEventListener('click', () => {
    applyStatsRangeMode('all');
    updateStatsCards();
    if (statsCurrentTab === 'expenses') loadStatsExpenses(); else loadStatsIncomes();
    renderStatsDistribution();
  });

  monthBtn?.addEventListener('click', () => {
    applyStatsRangeMode('month');
    updateStatsCards();
    if (statsCurrentTab === 'expenses') loadStatsExpenses(); else loadStatsIncomes();
    renderStatsDistribution();
  });

  yearBtn?.addEventListener('click', () => {
    applyStatsRangeMode('year');
    updateStatsCards();
    if (statsCurrentTab === 'expenses') loadStatsExpenses(); else loadStatsIncomes();
    renderStatsDistribution();
  });

  updateStatsControlLabels();
};

const renderStatsDistribution = () => {
  const donut = document.getElementById('stats-distribution-donut');
  const percentageEl = document.getElementById('stats-distribution-main-percentage');
  const labelEl = document.getElementById('stats-distribution-main-label');
  const legendEl = document.getElementById('stats-distribution-legend');

  if (!donut || !percentageEl || !labelEl || !legendEl) return;

  const records = statsCurrentTab === 'expenses' ? getFilteredExpenses() : getFilteredIncomes();

  if (records.length === 0) {
    donut.setAttribute('style', 'background: conic-gradient(var(--color-bg-elevated) 0deg 360deg);');
    percentageEl.textContent = '0%';
    labelEl.textContent = 'Sin datos';
    legendEl.innerHTML = '<p class="stats-legend-value">No hay movimientos para este filtro.</p>';
    return;
  }

  const totals = new Map<string, number>();
  records.forEach((record) => {
    const current = totals.get(record.category) || 0;
    totals.set(record.category, current + record.amount);
  });

  const sorted = Array.from(totals.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      ...getStatsCategoryMeta(category, statsCurrentTab),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  const grandTotal = sorted.reduce((sum, item) => sum + item.amount, 0);
  if (grandTotal <= 0) return;

  let angle = 0;
  const segments = sorted.map((item) => {
    const sweep = (item.amount / grandTotal) * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return `${hexToRgba(item.color, 0.7)} ${start}deg ${end}deg`;
  });

  donut.setAttribute('style', `background: conic-gradient(${segments.join(', ')});`);

  const top = sorted[0];
  const topPercentage = (top.amount / grandTotal) * 100;
  percentageEl.textContent = `${topPercentage.toFixed(0)}%`;
  labelEl.textContent = top.label;

  legendEl.innerHTML = sorted.map((item) => `
    <div class="stats-legend-item">
      <span class="stats-legend-dot" style="background:${hexToRgba(item.color, 0.8)}"></span>
      <div>
        <p class="stats-legend-name">${item.label}</p>
        <p class="stats-legend-value">${formatMoney(item.amount)}</p>
      </div>
    </div>
  `).join('');
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
    if (categoryFilter === '__subscription__') {
      expenses = expenses.filter(e => e.source === 'subscription');
    } else {
      expenses = expenses.filter(e => e.category === categoryFilter);
    }
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
      const subscriptionBadge = expense.source === 'subscription'
        ? '<span class="transaction-source-badge">Suscripción</span>'
        : '';
      const expenseDateText = formatStatDate(expense.date);

      return `
        <div class="expense-item stats-transaction-item" data-id="${expense.id}">
          <div class="expense-item-left">
            <div class="expense-item-icon" style="background: ${catColor}20; color: ${catColor};">
              <span class="material-symbols-outlined" style="font-size: 20px;">${catIcon}</span>
            </div>
            <div class="expense-item-details">
              <div class="expense-item-title-row">
                <p class="expense-item-title">${expense.detail || cat?.label || expense.category}</p>
                ${subscriptionBadge}
              </div>
              <div class="expense-item-category-badge">
                <span class="badge-dot" style="background: ${catColor};"></span>
                ${cat?.label || expense.category}
              </div>
              <p class="stats-transaction-meta">${expenseDateText}</p>
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
      const incomeDateText = formatStatDate(income.date);
      return `
        <div class="expense-item stats-transaction-item" data-id="${income.id}">
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
              <p class="stats-transaction-meta">${incomeDateText}</p>
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
      updateStatsControlLabels();

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

      renderStatsDistribution();
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
    updateStatsControlLabels();
    renderStatsDistribution();
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
  const dateStart = document.getElementById('stats-filter-date-start') as HTMLInputElement;
  const dateEnd = document.getElementById('stats-filter-date-end') as HTMLInputElement;

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (!select) return;

    if (statsRangeMode === 'all') {
      return;
    }

    if (statsRangeMode === 'month') {
      const monthOptions = Array.from(select.options).filter((o) => o.value !== 'all');
      const currentIndex = monthOptions.findIndex((o) => o.value === select.value);
      if (currentIndex === -1) return;

      if (direction === 'prev' && currentIndex < monthOptions.length - 1) {
        select.value = monthOptions[currentIndex + 1].value;
      } else if (direction === 'next' && currentIndex > 0) {
        select.value = monthOptions[currentIndex - 1].value;
      }
    }

    if (statsRangeMode === 'year' && dateStart && dateEnd) {
      const years = getAvailableStatsYears();
      const currentIndex = years.findIndex((year) => year === statsSelectedYear);
      if (currentIndex === -1) return;

      if (direction === 'prev' && currentIndex < years.length - 1) {
        statsSelectedYear = years[currentIndex + 1];
      } else if (direction === 'next' && currentIndex > 0) {
        statsSelectedYear = years[currentIndex - 1];
      }

      dateStart.value = `${statsSelectedYear}-01-01`;
      dateEnd.value = `${statsSelectedYear}-12-31`;
    }

    updateStatsCards();
    if (statsCurrentTab === 'expenses') {
      loadStatsExpenses();
    } else {
      loadStatsIncomes();
    }
    updateStatsControlLabels();
    renderStatsDistribution();
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
  const budgetsAvatarEl = document.getElementById('budgets-header-avatar');
  const username = (localStorage.getItem('username') || 'SaveIt').trim();
  if (budgetsAvatarEl) {
    budgetsAvatarEl.textContent = username ? username.charAt(0).toUpperCase() : '$';
  }

  renderBudgetsList();
};

const updateSubscriptionNotificationStatus = async () => {
  const statusEl = document.getElementById('subscription-notification-status');
  const enableBtn = document.getElementById('btn-enable-subscription-notifications') as HTMLButtonElement;
  if (!statusEl) return;

  const state = getNotificationPermissionState();

  if (state === 'unsupported') {
    statusEl.textContent = 'Estado: no soportado en este navegador';
    if (enableBtn) {
      enableBtn.disabled = true;
      enableBtn.textContent = 'No disponible';
    }
    return;
  }

  if (state === 'granted') {
    const oneSignalState = await getOneSignalSubscriptionState();

    if (oneSignalState === 'subscribed') {
      statusEl.textContent = 'Estado: activadas (OneSignal conectado)';
      if (enableBtn) {
        enableBtn.disabled = true;
        enableBtn.textContent = 'Activadas';
      }
    } else if (oneSignalState === 'not-subscribed') {
      statusEl.textContent = 'Estado: permiso concedido, falta suscripción push';
      if (enableBtn) {
        enableBtn.disabled = false;
        enableBtn.textContent = 'Reconectar';
      }
    } else {
      statusEl.textContent = 'Estado: permiso concedido, validando OneSignal...';
      if (enableBtn) {
        enableBtn.disabled = false;
        enableBtn.textContent = 'Reintentar';
      }
    }
  } else if (state === 'denied') {
    statusEl.textContent = 'Estado: bloqueadas';
    if (enableBtn) {
      enableBtn.disabled = true;
      enableBtn.textContent = 'Bloqueadas';
    }
  } else {
    statusEl.textContent = 'Estado: pendiente de permiso';
    if (enableBtn) {
      enableBtn.disabled = false;
      enableBtn.textContent = 'Activar';
    }
  }
};

const loadSubscriptionCategorySelect = () => {
  const select = document.getElementById('subscription-category') as HTMLSelectElement;
  if (!select) return;

  select.innerHTML = Object.entries(expenseGroups)
    .map(([key, group]) => `<option value="${key}">${group.label}</option>`)
    .join('');
};

const closeSubscriptionSheet = () => {
  const overlay = document.getElementById('subscription-sheet-overlay');
  if (overlay) overlay.classList.remove('active');
  delete (window as any).__editingSubscriptionId__;
};

const openSubscriptionSheet = (subscription?: Subscription) => {
  const overlay = document.getElementById('subscription-sheet-overlay');
  const title = document.getElementById('subscription-sheet-title');
  const nameInput = document.getElementById('subscription-name') as HTMLInputElement;
  const amountInput = document.getElementById('subscription-amount') as HTMLInputElement;
  const categoryInput = document.getElementById('subscription-category') as HTMLSelectElement;
  const billingDayInput = document.getElementById('subscription-billing-day') as HTMLInputElement;
  const startDateInput = document.getElementById('subscription-start-date') as HTMLInputElement;
  const notifyEnabledInput = document.getElementById('subscription-notify-enabled') as HTMLInputElement;
  const notifyDaysInput = document.getElementById('subscription-notify-days') as HTMLInputElement;

  loadSubscriptionCategorySelect();

  if (subscription) {
    if (title) title.textContent = 'Editar Suscripción';
    if (nameInput) nameInput.value = subscription.name;
    if (amountInput) amountInput.value = subscription.amount.toString();
    if (categoryInput) categoryInput.value = subscription.category;
    if (billingDayInput) billingDayInput.value = subscription.billingDay.toString();
    if (startDateInput) startDateInput.value = subscription.startDate;
    if (notifyEnabledInput) notifyEnabledInput.checked = subscription.notifyEnabled;
    if (notifyDaysInput) notifyDaysInput.value = subscription.notifyDaysBefore.toString();
    (window as any).__editingSubscriptionId__ = subscription.id;
  } else {
    if (title) title.textContent = 'Agregar Suscripción';
    if (nameInput) nameInput.value = '';
    if (amountInput) amountInput.value = '';
    if (categoryInput) categoryInput.value = 'needs';
    if (billingDayInput) billingDayInput.value = '1';
    if (startDateInput) startDateInput.value = getTodayLocalInputDateValue();
    if (notifyEnabledInput) notifyEnabledInput.checked = true;
    if (notifyDaysInput) notifyDaysInput.value = '1';
    delete (window as any).__editingSubscriptionId__;
  }

  if (overlay) overlay.classList.add('active');
};

const renderSubscriptionsList = () => {
  const container = document.getElementById('subscriptions-list');
  const banner = document.getElementById('subscriptions-upcoming-banner');
  const chips = document.getElementById('subscriptions-category-chips');
  if (!container) return;

  const subscriptions = getAllSubscriptions();
  const activeSubscriptions = subscriptions.filter((entry) => entry.status === 'active');

  if (banner) {
    const upcomingWeek = activeSubscriptions.filter((entry) => {
      const nextDate = getNextChargeDate(entry);
      const now = new Date();
      const diffMs = nextDate.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    });

    const totalWeek = upcomingWeek.reduce((sum, entry) => sum + entry.amount, 0);
    const renewalText = upcomingWeek.length === 1 ? 'renovación' : 'renovaciones';
    const bannerMessage = upcomingWeek.length === 0
      ? 'No tienes renovaciones en los próximos 7 días.'
      : `Tienes ${upcomingWeek.length} ${renewalText} esta semana. Total estimado: <strong>$${totalWeek.toFixed(2)}</strong>`;

    banner.innerHTML = `
      <div class="subscriptions-upcoming-glow" aria-hidden="true"></div>
      <div class="subscriptions-banner-icon-wrap">
        <span class="material-symbols-outlined">notifications_active</span>
      </div>
      <div class="subscriptions-banner-copy">
        <p class="subscriptions-banner-title">Próximos cobros</p>
        <p class="subscriptions-banner-text">${bannerMessage}</p>
      </div>
    `;
  }

  if (chips) {
    const categoryCounts = (Object.keys(expenseGroups) as ExpenseGroup[])
      .map((key) => ({
        key,
        label: expenseGroups[key].label,
        count: subscriptions.filter((entry) => entry.category === key).length,
      }))
      .filter((entry) => entry.count > 0);

    chips.innerHTML = [
      `<button class="subscriptions-chip ${subscriptionsFilter === 'all' ? 'active' : ''}" data-filter="all">Todas</button>`,
      ...categoryCounts.map((entry) => `
        <button class="subscriptions-chip ${subscriptionsFilter === entry.key ? 'active' : ''}" data-filter="${entry.key}">${entry.label}</button>
      `),
    ].join('');

    chips.querySelectorAll<HTMLButtonElement>('.subscriptions-chip').forEach((button) => {
      button.addEventListener('click', () => {
        const nextFilter = (button.dataset.filter || 'all') as 'all' | ExpenseGroup;
        subscriptionsFilter = nextFilter;
        renderSubscriptionsList();
      });
    });
  }

  const filteredSubscriptions = subscriptionsFilter === 'all'
    ? subscriptions
    : subscriptions.filter((entry) => entry.category === subscriptionsFilter);

  if (filteredSubscriptions.length === 0) {
    container.innerHTML = `
      <div class="expense-empty subscriptions-empty">
        <span class="material-symbols-outlined">receipt_long</span>
        <p>Sin suscripciones</p>
        <small>Aún no has registrado pagos recurrentes para este filtro.</small>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredSubscriptions.map((subscription) => {
    const category = expenseGroups[subscription.category];
    const nextChargeDate = getNextChargeDate(subscription);
    const nextCharge = nextChargeDate.toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const amountClass = subscription.status === 'active' ? 'active' : 'cancelled';
    const statusText = subscription.status === 'active' ? 'ACTIVA' : 'CANCELADA';
    const statusClass = subscription.status === 'active' ? 'active' : 'cancelled';
    const nextChargeText = subscription.status === 'active'
      ? `Próximo: ${nextCharge}`
      : 'Cancelada';

    return `
      <div class="subscription-card ${subscription.status === 'cancelled' ? 'cancelled' : ''} expense-item" data-subscription-id="${subscription.id}">
        <div class="subscription-card-icon" style="background: var(--color-bg-secondary); color: ${category.color};">
          <span class="material-symbols-outlined">${category.icon}</span>
        </div>
        <div class="subscription-card-content">
          <div class="subscription-card-top">
            <p class="subscription-card-title">${subscription.name}</p>
            <p class="subscription-card-amount ${amountClass}">-$${subscription.amount.toFixed(2)}</p>
          </div>

          <div class="subscription-card-tags">
            <span class="subscription-card-category">${category.label}</span>
            <span class="subscription-card-day">Día ${subscription.billingDay}</span>
          </div>

          <div class="subscription-card-bottom">
            <span class="subscription-next-charge">${nextChargeText}</span>
            <span class="subscription-status ${statusClass}">
              <span class="subscription-status-dot"></span>
              ${statusText}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.expense-item[data-subscription-id]').forEach((item) => {
    const id = (item as HTMLElement).dataset.subscriptionId;
    if (!id) return;
    const subscription = subscriptions.find((entry) => entry.id === id);
    if (!subscription) return;

    initSwipeSubscription(
      item as HTMLElement,
      subscription,
      (sub) => {
        openSubscriptionSheet(sub);
      },
      (subscriptionId) => {
        toggleSubscriptionStatus(subscriptionId);
        renderSubscriptionsList();
        showSnackbar('Suscripción actualizada', 'success');
      },
      (subscriptionId) => {
        confirmDeleteSubscription(subscriptionId);
      }
    );
  });
};

const handleSaveSubscription = () => {
  const nameInput = document.getElementById('subscription-name') as HTMLInputElement;
  const amountInput = document.getElementById('subscription-amount') as HTMLInputElement;
  const categoryInput = document.getElementById('subscription-category') as HTMLSelectElement;
  const billingDayInput = document.getElementById('subscription-billing-day') as HTMLInputElement;
  const startDateInput = document.getElementById('subscription-start-date') as HTMLInputElement;
  const notifyEnabledInput = document.getElementById('subscription-notify-enabled') as HTMLInputElement;
  const notifyDaysInput = document.getElementById('subscription-notify-days') as HTMLInputElement;

  const name = nameInput?.value.trim();
  const amount = parseFloat(amountInput?.value || '0');
  const category = categoryInput?.value as ExpenseGroup;
  const billingDay = parseInt(billingDayInput?.value || '0', 10);
  const startDate = startDateInput?.value;
  const notifyEnabled = Boolean(notifyEnabledInput?.checked);
  const notifyDaysBefore = parseInt(notifyDaysInput?.value || '1', 10);

  if (!name) {
    showSnackbar('Ingresa un nombre para la suscripción', 'error');
    return;
  }
  if (Number.isNaN(amount) || amount <= 0) {
    showSnackbar('Ingresa un monto válido', 'error');
    return;
  }
  if (!category || !(category in expenseGroups)) {
    showSnackbar('Selecciona una categoría válida', 'error');
    return;
  }
  if (Number.isNaN(billingDay) || billingDay < 1 || billingDay > 28) {
    showSnackbar('El día de cobro debe estar entre 1 y 28', 'error');
    return;
  }
  if (!startDate) {
    showSnackbar('Selecciona la fecha de inicio', 'error');
    return;
  }
  if (Number.isNaN(notifyDaysBefore) || notifyDaysBefore < 1 || notifyDaysBefore > 7) {
    showSnackbar('Los días de aviso deben estar entre 1 y 7', 'error');
    return;
  }

  const editingId = (window as any).__editingSubscriptionId__ as string | undefined;
  const existing = editingId ? getAllSubscriptions().find((item) => item.id === editingId) : null;
  const nowIso = new Date().toISOString();

  const subscription: Subscription = {
    id: existing?.id ?? crypto.randomUUID(),
    name,
    amount,
    category,
    billingDay,
    startDate,
    status: existing?.status ?? 'active',
    notifyEnabled,
    notifyDaysBefore,
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };

  upsertSubscription(subscription);
  closeSubscriptionSheet();
  renderSubscriptionsList();
  showSnackbar(existing ? 'Suscripción actualizada' : 'Suscripción creada', 'success');
};

const loadSubscriptionsView = () => {
  subscriptionsFilter = 'all';
  void updateSubscriptionNotificationStatus();
  renderSubscriptionsList();
};

const updateNotificationBell = () => {
  const dot = document.getElementById('notification-dot');
  if (!dot) return;

  const unread = getNotificationUnreadCount();
  dot.classList.toggle('hidden', unread === 0);
};

const renderNotificationsList = () => {
  const container = document.getElementById('notifications-list');
  if (!container) return;

  const items = getNotificationCenterItems();

  if (items.length === 0) {
    container.innerHTML = `
      <div class="expense-empty" style="padding: 20px 0;">
        <span class="material-symbols-outlined" style="font-size: 36px; opacity: 0.4;">notifications</span>
        <p>Sin notificaciones</p>
        <small>Cuando haya cobros o recordatorios aparecerán aquí.</small>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map((item) => {
    const dateText = new Date(item.createdAt).toLocaleString('es-EC', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
      <div class="notification-item ${item.read ? 'read' : 'unread'}">
        <div class="notification-item-header">
          <p class="notification-item-title">${item.title}</p>
          <span class="notification-item-date">${dateText}</span>
        </div>
        <p class="notification-item-body">${item.body}</p>
      </div>
    `;
  }).join('');
};

const openNotificationsSheet = () => {
  renderNotificationsList();
  const overlay = document.getElementById('notifications-sheet-overlay');
  if (overlay) overlay.classList.add('active');
};

const closeNotificationsSheet = () => {
  const overlay = document.getElementById('notifications-sheet-overlay');
  if (overlay) overlay.classList.remove('active');
};

const setupSyncStatusIndicator = () => {
  const indicator = document.getElementById('sync-status-indicator');
  if (!indicator) return;

  let hideTimer: number | null = null;

  const show = (message: string, color: string) => {
    indicator.textContent = message;
    indicator.style.color = color;
    indicator.classList.add('visible');
  };

  const hide = (delay = 0) => {
    if (hideTimer) {
      window.clearTimeout(hideTimer);
    }

    if (delay <= 0) {
      indicator.classList.remove('visible');
      return;
    }

    hideTimer = window.setTimeout(() => {
      indicator.classList.remove('visible');
    }, delay);
  };

  window.addEventListener('firestoreSyncStatus', ((event: Event) => {
    const customEvent = event as CustomEvent<{ status: 'syncing' | 'synced' | 'error' | 'offline' }>;
    const status = customEvent.detail?.status;

    if (status === 'syncing') {
      show('Sincronizando…', '#94a3b8');
      return;
    }

    if (status === 'synced') {
      show('Sincronizado', '#86efac');
      hide(1200);
      return;
    }

    if (status === 'offline') {
      show('Sin conexión (modo local)', '#facc15');
      hide(2200);
      return;
    }

    if (status === 'error') {
      show('Error de sincronización', '#fca5a5');
      hide(2200);
    }
  }) as EventListener);
};

const loadProfileView = () => {
  loadUserSettings();
  updateAuthUi();
};

const getAuthCredentials = (): { email: string; password: string } => {
  const emailInput = document.getElementById('auth-email') as HTMLInputElement;
  const passwordInput = document.getElementById('auth-password') as HTMLInputElement;

  return {
    email: emailInput?.value?.trim() || '',
    password: passwordInput?.value?.trim() || '',
  };
};

const updateAuthUi = () => {
  const authStatus = document.getElementById('auth-status-text');
  const authSessionEmail = document.getElementById('auth-session-email');
  const credentialsGroup = document.getElementById('auth-credentials-group');
  const authEmailInput = document.getElementById('auth-email') as HTMLInputElement;
  const authPasswordInput = document.getElementById('auth-password') as HTMLInputElement;
  const loginBtn = document.getElementById('btn-auth-login') as HTMLButtonElement;
  const registerBtn = document.getElementById('btn-auth-register') as HTMLButtonElement;
  const logoutBtn = document.getElementById('btn-auth-logout') as HTMLButtonElement;
  const profileEmailInput = document.getElementById('profile-email') as HTMLInputElement;
  const profileSyncIndicator = document.getElementById('profile-sync-indicator');
  const persistedSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');

  if (authStatus) {
    if (currentAuthUser) {
      authStatus.textContent = 'Sesión iniciada';
      authStatus.style.color = '#86efac';
    } else {
      authStatus.textContent = 'Sin sesión';
      authStatus.style.color = 'var(--color-text-secondary)';
    }
  }

  if (authSessionEmail) {
    authSessionEmail.textContent = currentAuthUser?.email ? `Conectado como ${currentAuthUser.email}` : '';
    authSessionEmail.style.display = currentAuthUser ? 'block' : 'none';
  }

  if (profileSyncIndicator) {
    profileSyncIndicator.textContent = currentAuthUser
      ? 'Sesión activa: perfil sincronizado. Ajustes visuales también se guardan localmente.'
      : 'Sin sesión: tus ajustes se guardan solo en este dispositivo.';
  }

  if (credentialsGroup) {
    credentialsGroup.style.display = currentAuthUser ? 'none' : 'block';
  }

  if (currentAuthUser) {
    if (authEmailInput) authEmailInput.value = '';
    if (authPasswordInput) authPasswordInput.value = '';
  }

  if (loginBtn) {
    loginBtn.style.display = currentAuthUser ? 'none' : 'block';
  }

  if (registerBtn) {
    registerBtn.style.display = currentAuthUser ? 'none' : 'block';
  }

  if (logoutBtn) {
    logoutBtn.style.display = currentAuthUser ? 'block' : 'none';
  }

  if (profileEmailInput) {
    profileEmailInput.value = currentAuthUser?.email || persistedSettings.email || '';
    profileEmailInput.readOnly = Boolean(currentAuthUser);
  }

  const nameInput = document.getElementById('profile-name') as HTMLInputElement;
  const resolvedName = (nameInput?.value || persistedSettings.name || currentAuthUser?.displayName || 'SaveIt User').trim();
  const displayNameEl = document.getElementById('profile-display-name');
  if (displayNameEl) displayNameEl.textContent = resolvedName;
  updateProfileAvatar(resolvedName);
};

const setupAuthStateSync = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    let initialized = false;

    subscribeAuthState(async (user) => {
      currentAuthUser = user;
      updateAuthUi();
      await syncOneSignalIdentity(user);

      if (user) {
        await initializeFirestoreSync(user.uid);
      } else {
        if (lastAuthUid) {
          clearTrackedLocalData();
        }
        await initializeFirestoreSync();
      }

      lastAuthUid = user?.uid || null;

      loadHomeView();
      if (currentView === 'profile') {
        loadProfileView();
      }
      if (currentView === 'stats') {
        updateStatsCards();
        if (statsCurrentTab === 'expenses') {
          loadStatsExpenses();
        } else {
          loadStatsIncomes();
        }
      }

      if (!initialized) {
        initialized = true;
        resolve();
      }
    });
  });
};

const getReadableAuthError = (code: string): string => {
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Credenciales inválidas';
  }
  if (code.includes('email-already-in-use')) {
    return 'Ese email ya está registrado';
  }
  if (code.includes('weak-password')) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  if (code.includes('invalid-email')) {
    return 'Email inválido';
  }
  return 'No se pudo completar la autenticación';
};

const loadUserSettings = () => {
  const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
  const nameInput = document.getElementById('profile-name') as HTMLInputElement;
  const emailInput = document.getElementById('profile-email') as HTMLInputElement;
  const displayNameEl = document.getElementById('profile-display-name');
  const memberSinceEl = document.getElementById('profile-member-since');

  if (nameInput) nameInput.value = settings.name || '';
  if (emailInput) {
    emailInput.value = currentAuthUser?.email || settings.email || '';
    emailInput.readOnly = Boolean(currentAuthUser);
  }

  const resolvedName = settings.name || currentAuthUser?.displayName || 'SaveIt User';
  if (displayNameEl) {
    displayNameEl.textContent = resolvedName;
  }

  const memberSinceRaw = settings.memberSince || localStorage.getItem('profileMemberSince') || new Date().toISOString();
  if (!settings.memberSince) {
    const updatedSettings = { ...settings, memberSince: memberSinceRaw };
    localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
    localStorage.setItem('profileMemberSince', memberSinceRaw);
  }

  const memberSinceDate = new Date(memberSinceRaw);
  const memberSinceText = Number.isNaN(memberSinceDate.getTime())
    ? 'Miembro desde Enero 2024'
    : `Miembro desde ${memberSinceDate.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })}`;

  if (memberSinceEl) {
    memberSinceEl.innerHTML = `<span class="material-symbols-outlined">calendar_today</span>${memberSinceText}`;
  }

  updateProfileAvatar(resolvedName);
};

const updateProfileAvatar = (name: string) => {
  const avatarEl = document.getElementById('profile-avatar');
  const headerAvatarEl = document.getElementById('profile-header-avatar');
  if (!avatarEl && !headerAvatarEl) return;

  const applyHeaderFallback = () => {
    if (!headerAvatarEl) return;
    headerAvatarEl.textContent = 'S';
  };

  if (name.trim()) {
    const initial = name.charAt(0).toUpperCase();
    if (avatarEl) {
      avatarEl.innerHTML = `<span class="profile-avatar-initial">${initial}</span>`;
      avatarEl.style.background = '#30c9e8';
    }
    if (headerAvatarEl) {
      headerAvatarEl.textContent = initial;
    }
  } else {
    if (avatarEl) {
      avatarEl.innerHTML = '<span class="material-symbols-outlined">account_circle</span>';
      avatarEl.style.background = '';
    }
    applyHeaderFallback();
  }
};

const saveUserSettings = () => {
  const nameInput = document.getElementById('profile-name') as HTMLInputElement;
  const emailInput = document.getElementById('profile-email') as HTMLInputElement;

  const persisted = JSON.parse(localStorage.getItem('userSettings') || '{}');
  const settings = {
    name: nameInput?.value?.trim() || '',
    email: currentAuthUser?.email || emailInput?.value?.trim() || persisted.email || ''
  };

  localStorage.setItem('userSettings', JSON.stringify(settings));
  updateProfileAvatar(settings.name);
  showSnackbar('Perfil guardado', 'success');
};

const openPasswordSheet = () => {
  const overlay = document.getElementById('password-sheet-overlay');
  const currentInput = document.getElementById('current-password') as HTMLInputElement;
  const newInput = document.getElementById('new-password') as HTMLInputElement;
  const confirmInput = document.getElementById('confirm-password') as HTMLInputElement;

  if (currentInput) currentInput.value = '';
  if (newInput) newInput.value = '';
  if (confirmInput) confirmInput.value = '';

  overlay?.classList.add('active');
};

const closePasswordSheet = () => {
  const overlay = document.getElementById('password-sheet-overlay');
  overlay?.classList.remove('active');
};

const handleChangePassword = async () => {
  const currentInput = document.getElementById('current-password') as HTMLInputElement;
  const newInput = document.getElementById('new-password') as HTMLInputElement;
  const confirmInput = document.getElementById('confirm-password') as HTMLInputElement;

  const currentPassword = currentInput?.value?.trim() || '';
  const newPassword = newInput?.value?.trim() || '';
  const confirmPassword = confirmInput?.value?.trim() || '';

  if (!currentAuthUser) {
    showSnackbar('Debes iniciar sesión para cambiar contraseña', 'warning');
    return;
  }

  if (!currentPassword || !newPassword || !confirmPassword) {
    showSnackbar('Completa todos los campos', 'warning');
    return;
  }

  if (newPassword.length < 6) {
    showSnackbar('La nueva contraseña debe tener al menos 6 caracteres', 'warning');
    return;
  }

  if (newPassword !== confirmPassword) {
    showSnackbar('Las contraseñas no coinciden', 'warning');
    return;
  }

  try {
    await changeCurrentUserPassword(currentPassword, newPassword);
    closePasswordSheet();
    showSnackbar('Contraseña actualizada', 'success');
  } catch (error) {
    const err = error as { code?: string; message?: string };
    showSnackbar(getReadableAuthError(err.code || err.message || ''), 'error');
  }
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
  const expenses = getAllExpenses();
  const incomes = getAllIncomes();

  if (customCategories.length === 0) {
    container.innerHTML = `
      <div class="expense-empty profile-categories-empty">
        <span class="material-symbols-outlined" style="font-size: 42px; opacity: 0.3;">category</span>
        <p>No hay categorías personalizadas</p>
        <small>Agrega categorías para organizar tus gastos</small>
      </div>
    `;
    return;
  }

  container.innerHTML = customCategories.map(cat => {
    const relatedExpenses = cat.type === 'expense'
      ? expenses.filter((expense) => expense.category === `custom_${cat.id}` || expense.category === cat.id).length
      : incomes.filter((income) => income.category === `custom_${cat.id}` || income.category === cat.id).length;

    return `
    <div class="category-item profile-category-item" data-id="${cat.id}">
      <div class="category-item-left">
        <div class="category-item-icon" style="background: ${cat.color}1A; color: ${cat.color};">
          <span class="material-symbols-outlined">${cat.icon}</span>
        </div>
        <div>
          <p class="category-item-name">${cat.name}</p>
          <p class="profile-category-meta">${relatedExpenses} transacciones este mes</p>
        </div>
      </div>
      <button class="profile-category-edit" type="button" aria-label="Editar categoría ${cat.name}">
        <span class="material-symbols-outlined">edit</span>
      </button>
    </div>
  `;
  }).join('');

  container.querySelectorAll<HTMLButtonElement>('.profile-category-edit').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const id = (button.closest('.category-item') as HTMLElement | null)?.dataset.id;
      if (id) editCategory(id);
    });
  });

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
    if (legendContainer) legendContainer.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); font-size: 13px; margin: 6px 0 0;">No hay gastos este mes</p>';
    return;
  }

  if (barContainer) {
    barContainer.innerHTML = stats.slice(0, 3).map((s) => `
      <div class="home-category-progress-item">
        <div class="home-category-progress-header">
          <span class="home-category-progress-label">${s.label}</span>
          <span class="home-category-progress-value">${s.percentage.toFixed(0)}%</span>
        </div>
        <div class="home-category-progress-track">
          <span class="home-category-progress-fill" style="width: ${Math.min(s.percentage, 100)}%; --category-color: ${s.color};"></span>
        </div>
      </div>
    `).join('');
  }

  if (legendContainer) {
    legendContainer.innerHTML = '';
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
  if (dateInput) dateInput.value = getTodayLocalInputDateValue();
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
  const date = dateInput?.value || getTodayLocalInputDateValue();

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
        date: new Date(`${date}T00:00:00`).toISOString()
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
    date: new Date(`${date}T00:00:00`).toISOString()
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
  const subscriptionOption = document.getElementById('radial-option-subscription') as HTMLElement;
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
    subscriptionOption?.classList.add('active');
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
    subscriptionOption?.classList.remove('active', 'selected');
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

  const getSelectedOptionByPointer = (x: number, y: number, deltaX: number, deltaY: number): string | null => {
    const dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const deadZone = 18;
    if (dragDistance < deadZone) return null;

    const optionMap: Array<{ key: string; el: HTMLElement | null }> = [
      { key: 'expense', el: expenseOption },
      { key: 'income', el: incomeOption },
      { key: 'budget', el: budgetOption },
      { key: 'subscription', el: subscriptionOption },
    ];

    let closest: { key: string; distance: number } | null = null;

    for (const option of optionMap) {
      if (!option.el) continue;
      const rect = option.el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(x - centerX, y - centerY);

      if (!closest || distance < closest.distance) {
        closest = { key: option.key, distance };
      }
    }

    const activationRadius = 90;
    if (!closest || closest.distance > activationRadius) return null;

    return closest.key;
  };

  const highlightOption = (option: string | null) => {
    expenseOption?.classList.toggle('selected', option === 'expense');
    incomeOption?.classList.toggle('selected', option === 'income');
    budgetOption?.classList.toggle('selected', option === 'budget');
    subscriptionOption?.classList.toggle('selected', option === 'subscription');
    currentHoveredOption = option;
  };

  const clearHighlight = () => {
    expenseOption?.classList.remove('selected');
    incomeOption?.classList.remove('selected');
    budgetOption?.classList.remove('selected');
    subscriptionOption?.classList.remove('selected');
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
      const selectedOption = getSelectedOptionByPointer(pos.x, pos.y, deltaX, deltaY);
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
      selectedAction = getSelectedOptionByPointer(pos.x, pos.y, deltaX, deltaY);
    }

    hideRadialMenu();

    if (selectedAction === 'expense') {
      openBottomSheet();
    } else if (selectedAction === 'income') {
      openIncomeSheet();
    } else if (selectedAction === 'budget') {
      openBudgetConfigModal();
    } else if (selectedAction === 'subscription') {
      openSubscriptionSheet();
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
  if (dateInput) dateInput.value = getTodayLocalInputDateValue();
  if (categorySelect) categorySelect.value = '';
  if (titleEl) titleEl.textContent = 'Agregar Gasto';
  delete (window as any).__editingExpenseId__;
};

const loadCategorySelect = () => {
  const select = document.getElementById('expense-category') as HTMLSelectElement;
  const budgetSelect = document.getElementById('budget-category') as HTMLSelectElement;

  if (select) {
    const defaultOptions = Object.entries(expenseGroups)
      .map(([key, group]) => `<option value="${key}">${group.label}</option>`)
      .join('');
    select.innerHTML = defaultOptions;
  }

  // Budget select is no longer used for manual budget entry
  if (budgetSelect) {
    budgetSelect.innerHTML = '';
  }

  loadQuickCategories();
};

const loadIncomeCategorySelect = () => {
  const select = document.getElementById('income-category') as HTMLSelectElement;

  if (select) {
    const defaultOptions = Object.entries(incomeCategories)
      .map(([key, cat]) => `<option value="${key}">${cat.label}</option>`)
      .join('');
    select.innerHTML = '<option value="">Selecciona una opción</option>' + defaultOptions;
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
  const date = dateInput?.value || getTodayLocalInputDateValue();

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
        date: new Date(`${date}T00:00:00`).toISOString()
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
    date: new Date(`${date}T00:00:00`).toISOString(),
    source: 'manual' as const,
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

  document.getElementById('btn-open-subscription-sheet')?.addEventListener('click', () => openSubscriptionSheet());
  document.getElementById('btn-close-subscription-sheet')?.addEventListener('click', closeSubscriptionSheet);
  document.getElementById('subscription-sheet-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSubscriptionSheet();
  });
  document.getElementById('btn-save-subscription')?.addEventListener('click', handleSaveSubscription);

  document.getElementById('btn-enable-subscription-notifications')?.addEventListener('click', async () => {
    const permission = await requestSubscriptionNotificationPermission();
    await updateSubscriptionNotificationStatus();

    if (permission === 'granted') {
      showSnackbar('Notificaciones activadas', 'success');
    } else if (permission === 'denied') {
      showSnackbar('Las notificaciones fueron bloqueadas', 'warning');
    } else if (permission === 'unsupported') {
      showSnackbar('Este navegador no soporta notificaciones', 'warning');
    }
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
  document.getElementById('btn-open-subscriptions-view')?.addEventListener('click', () => showView('subscriptions'));
  document.getElementById('btn-open-budget-config')?.addEventListener('click', () => openBudgetConfigModal());
  document.getElementById('btn-open-notifications')?.addEventListener('click', () => openNotificationsSheet());
  document.getElementById('btn-open-notifications-profile')?.addEventListener('click', () => openNotificationsSheet());
  document.getElementById('btn-close-notifications-sheet')?.addEventListener('click', closeNotificationsSheet);
  document.getElementById('notifications-sheet-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeNotificationsSheet();
  });

  document.getElementById('btn-mark-notifications-read')?.addEventListener('click', () => {
    markAllNotificationsAsRead();
    renderNotificationsList();
    showSnackbar('Notificaciones marcadas como leídas', 'success');
  });

  document.getElementById('btn-enable-notifications-home')?.addEventListener('click', async () => {
    const permission = await requestSubscriptionNotificationPermission();
    if (permission === 'granted') {
      showSnackbar('Notificaciones activadas', 'success');
    } else if (permission === 'denied') {
      showSnackbar('Las notificaciones fueron bloqueadas', 'warning');
    } else if (permission === 'unsupported') {
      showSnackbar('Este navegador no soporta notificaciones', 'warning');
    }
  });

  document.getElementById('btn-back-stats')?.addEventListener('click', () => showView('home'));
  document.getElementById('btn-back-subscriptions')?.addEventListener('click', () => showView('budgets'));
  document.getElementById('btn-back-budgets')?.addEventListener('click', () => showView('home'));
  document.getElementById('btn-back-profile')?.addEventListener('click', () => showView('home'));

  document.getElementById('btn-save-profile')?.addEventListener('click', saveUserSettings);
  document.getElementById('btn-edit-avatar')?.addEventListener('click', () => showSnackbar('Edición de avatar próximamente', 'warning'));
  document.getElementById('btn-open-change-password')?.addEventListener('click', openPasswordSheet);
  document.getElementById('btn-close-password-sheet')?.addEventListener('click', closePasswordSheet);
  document.getElementById('password-sheet-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closePasswordSheet();
  });
  document.getElementById('btn-save-password')?.addEventListener('click', () => {
    handleChangePassword();
  });

  document.getElementById('btn-auth-login')?.addEventListener('click', async () => {
    const { email, password } = getAuthCredentials();
    if (!email || !password) {
      showSnackbar('Completa email y contraseña', 'warning');
      return;
    }

    try {
      await loginWithEmailPassword(email, password);
      showSnackbar('Sesión iniciada', 'success');
    } catch (error) {
      const err = error as { code?: string };
      showSnackbar(getReadableAuthError(err.code || ''), 'error');
    }
  });

  document.getElementById('btn-auth-register')?.addEventListener('click', async () => {
    const { email, password } = getAuthCredentials();
    if (!email || !password) {
      showSnackbar('Completa email y contraseña', 'warning');
      return;
    }

    try {
      await registerWithEmailPassword(email, password);
      showSnackbar('Cuenta creada e iniciada', 'success');
    } catch (error) {
      const err = error as { code?: string };
      showSnackbar(getReadableAuthError(err.code || ''), 'error');
    }
  });

  document.getElementById('btn-auth-logout')?.addEventListener('click', async () => {
    try {
      await clearOneSignalIdentity();
      await logoutCurrentUser();
      showSnackbar('Sesión cerrada', 'success');
    } catch (error) {
      const err = error as { code?: string };
      showSnackbar(getReadableAuthError(err.code || ''), 'error');
    }
  });

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

window.addEventListener('subscriptionDeleted', () => {
  if (currentView === 'subscriptions') {
    renderSubscriptionsList();
  }
  loadHomeView();
  if (currentView === 'stats') {
    updateStatsCards();
    if (statsCurrentTab === 'expenses') {
      loadStatsExpenses();
    }
  }
  showSnackbar('Suscripción eliminada', 'success');
});

window.addEventListener('notificationCenterUpdated', () => {
  updateNotificationBell();
  const overlay = document.getElementById('notifications-sheet-overlay');
  if (overlay?.classList.contains('active')) {
    renderNotificationsList();
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
  setupSyncStatusIndicator();
  await setupAuthStateSync();
  runMigration();
  
  loadCategorySelect();
  loadIncomeCategorySelect();
  clearExpenseForm();
  setupEventListeners();
  initRadialMenu();
  initViewSwipe();
  loadHomeView();
  checkBudgetAlertsOnLoad();

  processSubscriptionsForToday()
    .then(({ generatedCount }) => {
      if (generatedCount > 0) {
        loadHomeView();
        if (currentView === 'stats') {
          updateStatsCards();
          if (statsCurrentTab === 'expenses') {
            loadStatsExpenses();
          }
        }
        showSnackbar(`Se registraron ${generatedCount} suscripción(es) automáticamente`, 'success');
      }
    })
    .catch(() => {
      // No bloquear inicio de app por proceso en background
    });
}

initApp();
