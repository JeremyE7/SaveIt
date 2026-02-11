import type { Expense } from "../types/Expense";
import { $formExpense } from "../dom/htmlElements";
import {
  getDataFromLocalStorage,
  setDataToLocalStorage,
} from "../utils/LocalStorage";
import type { Category } from "../types/Categories";
import { closeModal } from "./modal";

export const getExpenses = () => {
  const expenses = getDataFromLocalStorage<Expense[]>("expenses");
  return expenses ?? [];
};

export const addExpense = (expense: Expense) => {
  const expenses = getExpenses();
  expenses.push(expense);
  setDataToLocalStorage<Expense[]>("expenses", expenses);
};

export const saveExpense = (event: SubmitEvent) => {
  event.stopImmediatePropagation();
  event.preventDefault();
  if (!$formExpense) {
    console.error("Formulario no encontrado");
    return;
  }
  const formData = new FormData($formExpense);

  const newExpense = {
    amount: parseFloat(formData.get("amount") as string),
    category: formData.get("category") as Category,
    detail: formData.get("details") as string,
    date: new Date().toISOString(),
    id: crypto.randomUUID(),
  };

  addExpense(newExpense);
  console.log(newExpense);
  closeModal();
};
