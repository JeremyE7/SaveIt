import type { Expense } from "../types/Expense";
import { $formExpense, hideButton, loadExpenses } from "../dom/htmlElements";
import {
  getDataFromLocalStorage,
  setDataToLocalStorage,
} from "../utils/LocalStorage";
import { categories, type Category } from "../types/Categories";
import { closeModal } from "./modal";
import { generatePieChart } from "./graphs";

export const getAllExpenses = () => {
  const expenses = getDataFromLocalStorage<Expense[]>("expenses");
  return expenses ?? [];
};

export const getFilteredExpenses = () => {
  const expenses = getDataFromLocalStorage<Expense[]>("filteredExpenses");
  return expenses ?? [];
};

export const setFilteredExpenses = (expenses: Expense[]) => {
  setDataToLocalStorage<Expense[]>("filteredExpenses", expenses);
};

export const resetFilters = () => {
  const expenses = getAllExpenses();
  setDataToLocalStorage<Expense[]>("filteredExpenses", expenses);
  loadExpenses();
  hideButton();
  return expenses;
};

export const addExpense = (expense: Expense) => {
  const expenses = getAllExpenses();
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
  resetFilters();
  closeModal();
  loadExpenses();
};

export const filterExpenses = (category: Category) => {
  const expenses = getAllExpenses();
  const filteredExpenses = expenses.filter(
    (expense) => expense.category === category,
  );
  setFilteredExpenses(filteredExpenses);
  loadExpenses();
};

export const drawExpenses = () => {
  const expenses = getAllExpenses();

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
      colors.push(categories[expense.category].color);
    }
  });

  generatePieChart(labels, data, colors);
};
