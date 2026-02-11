import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { solicitarPermiso } from "./utils/mobile";
import { loadButtons } from "./dom/loadButtons";
import { loadKeys } from "./dom/loadKeys";
import { loadCategoryOptions, loadExpenses } from "./dom/htmlElements";
import { resetFilters } from "./features/expenses";

registerSW({ immediate: false });

async function initApp() {
  solicitarPermiso();
  loadButtons();
  loadKeys();
  loadCategoryOptions();
  resetFilters();
  loadExpenses();
}

initApp();
