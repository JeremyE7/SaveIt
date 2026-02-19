import {
  $button,
  $cancelBtn,
  $expenseList,
  $formExpense,
  $limpiarFiltros,
  addViewTransitionNameToVariousElements,
  removeViewTransitionNameFromVariousElements,
} from "./htmlElements";
import { openModal, closeModal } from "../features/modal";
import { resetFilters, saveExpense, filterByDateRange, type PeriodFilter } from "../features/expenses";
import { exportData, importData } from "../features/importExport";
import { getCategoryBudgetStatus } from "../features/budgetModal";
import { withTransition } from "../utils/viewTransitions";
import { showSuccess, showError } from "../features/toast";

const updateBudgetIndicator = () => {
  const $selectCategory = document.getElementById('expense-category') as HTMLSelectElement | null;
  const $budgetIndicator = document.getElementById('budget-indicator');

  if (!$selectCategory || !$budgetIndicator) return;

  const category = $selectCategory.value;
  const status = getCategoryBudgetStatus(category);

  if (!status || !status.hasBudget) {
    $budgetIndicator.classList.add('hidden');
    return;
  }

  const remaining = status.budget - status.spent;
  const willExceed = remaining <= 0;
  const isWarning = status.percentage >= 80;

  $budgetIndicator.classList.remove('hidden');

  if (willExceed) {
    $budgetIndicator.className = 'p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm';
    $budgetIndicator.innerHTML = `
      <div class="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>¡Presupuesto excedido! Has gastado ${status.spent.toFixed(0)}$ de ${status.budget}$</span>
      </div>
    `;
  } else if (isWarning) {
    $budgetIndicator.className = 'p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 text-sm';
    $budgetIndicator.innerHTML = `
      <div class="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>¡Cuidado! Quedan ${remaining.toFixed(0)}$ de ${status.budget}$ (${status.percentage.toFixed(0)}% usado)</span>
      </div>
    `;
  } else {
    $budgetIndicator.className = 'p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-400 text-sm';
    $budgetIndicator.innerHTML = `
      <div class="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span>Presupuesto: ${remaining.toFixed(0)}$ restantes de ${status.budget}$</span>
      </div>
    `;
  }
};

export function loadButtons() {
  $button?.addEventListener("click", () => openModal($button));
  $cancelBtn?.addEventListener("click", closeModal);
  $formExpense?.addEventListener("submit", saveExpense);
  $limpiarFiltros?.addEventListener("click", resetFilters);

  const $expenseCategorySelect = document.getElementById('expense-category');
  $expenseCategorySelect?.addEventListener('change', updateBudgetIndicator);

  const $filterDateStart = document.getElementById('filter-date-start') as HTMLInputElement | null;
  const $filterDateEnd = document.getElementById('filter-date-end') as HTMLInputElement | null;
  const $filterPeriod = document.getElementById('filter-period') as HTMLSelectElement | null;
  const $exportBtn = document.getElementById('export-btn');
  const $importBtn = document.getElementById('import-btn');
  const $importFile = document.getElementById('import-file') as HTMLInputElement | null;

  const today = new Date().toISOString().split('T')[0];
  $filterDateStart?.setAttribute('max', today);
  $filterDateEnd?.setAttribute('max', today);

  const applyFilters = () => {
    const startDate = $filterDateStart?.value || null;
    const endDate = $filterDateEnd?.value || null;
    const period = ($filterPeriod?.value || 'all') as PeriodFilter;

    if (startDate && endDate && startDate > endDate) {
      showError("La fecha 'Desde' no puede ser mayor que 'Hasta'");
      return;
    }

    const hasFilters = startDate || endDate || period !== 'all';
    $limpiarFiltros?.classList.toggle('hidden', !hasFilters);

    const liItems = Array.from($expenseList.children) as HTMLElement[];
    addViewTransitionNameToVariousElements(liItems, "list-item");
    withTransition(() => {
      filterByDateRange(startDate, endDate, period);
    });
    removeViewTransitionNameFromVariousElements(liItems);
    showSuccess("Filtros aplicados");
  };

  const validateDateInputs = () => {
    const startDate = $filterDateStart?.value;
    const endDate = $filterDateEnd?.value;

    if (startDate && endDate && startDate > endDate) {
      $filterDateEnd?.setCustomValidity("La fecha debe ser mayor o igual a 'Desde'");
      $filterDateEnd?.reportValidity();
    } else {
      $filterDateEnd?.setCustomValidity("");
    }
  };

  $filterDateStart?.addEventListener('change', () => {
    validateDateInputs();
    applyFilters();
  });
  $filterDateEnd?.addEventListener('change', applyFilters);
  $filterPeriod?.addEventListener('change', applyFilters);

  $exportBtn?.addEventListener('click', () => exportData('json'));

  $importBtn?.addEventListener('click', () => {
    $importFile?.click();
  });

  $importFile?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      await importData(file);
      resetFilters();
      (e.target as HTMLInputElement).value = '';
    }
  });
}
