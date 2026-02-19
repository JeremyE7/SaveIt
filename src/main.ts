import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { solicitarPermiso } from "./utils/mobile";
import { loadButtons } from "./dom/loadButtons";
import { loadKeys } from "./dom/loadKeys";
import { loadCategoryOptions, loadExpenses } from "./dom/htmlElements";
import { resetFilters } from "./features/expenses";
import { showBudgetsView, hideBudgetsView, handleBudgetSubmit, checkBudgetAlertsOnLoad } from "./features/budgetModal";

registerSW({ immediate: false });

function setupBudgetView() {
  const $budgetBtn = document.getElementById('budget-btn');
  const $backBtn = document.getElementById('back-to-expenses');
  const $budgetForm = document.getElementById('budgetForm') as HTMLFormElement | null;

  $budgetBtn?.addEventListener('click', showBudgetsView);
  $backBtn?.addEventListener('click', hideBudgetsView);
  $budgetForm?.addEventListener('submit', handleBudgetSubmit);
}

async function initApp() {
  solicitarPermiso();
  loadButtons();
  loadKeys();
  loadCategoryOptions();
  resetFilters();
  loadExpenses();
  setupBudgetView();
  checkBudgetAlertsOnLoad();
}

initApp();
