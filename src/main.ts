import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { solicitarPermiso } from "./utils/mobile";
import { loadButtons } from "./dom/loadButtons";
import { loadKeys } from "./dom/loadKeys";
import { getExpenses } from "./features/expenses";
import { loadCategoryOptions, loadExpenses } from "./dom/htmlElements";

registerSW({ immediate: false });

async function initApp() {
  solicitarPermiso();
  loadButtons();
  loadKeys();
  loadCategoryOptions();
  loadExpenses();
  getExpenses();
}

initApp();
