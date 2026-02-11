import { $button, $cancelBtn, $formExpense } from "./htmlElements";
import { openModal, closeModal } from "../features/modal";
import { saveExpense } from "../features/expenses";

export function loadButtons() {
  $button?.addEventListener("click", openModal);
  $cancelBtn?.addEventListener("click", closeModal);
  $formExpense?.addEventListener("submit", saveExpense);
}
