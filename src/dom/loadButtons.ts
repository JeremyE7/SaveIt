import {
  $button,
  $cancelBtn,
  $formExpense,
  $limpiarFiltros,
} from "./htmlElements";
import { openModal, closeModal } from "../features/modal";
import { resetFilters, saveExpense } from "../features/expenses";

export function loadButtons() {
  $button?.addEventListener("click", () => openModal($button));
  $cancelBtn?.addEventListener("click", closeModal);
  $formExpense?.addEventListener("submit", saveExpense);
  $limpiarFiltros?.addEventListener("click", resetFilters);
}
