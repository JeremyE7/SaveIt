import type { Expense } from "../types/Expense";
import {
  $expenseList,
  $formExpense,
  addViewTransitionNameToAnElement,
  addViewTransitionNameToVariousElements,
  addVisualExpense,
  deleteVisualExpense,
  hideButton,
  loadExpenses,
  removeViewTransitionNameFromAnElement,
  removeViewTransitionNameFromVariousElements,
} from "../dom/htmlElements";
import {
  getDataFromLocalStorage,
  setDataToLocalStorage,
} from "../utils/LocalStorage";
import { categories, type Category } from "../types/Categories";
import { closeModal } from "./modal";
import { generatePieChart } from "./graphs";
import { withTransition } from "../utils/viewTransitions";

let expenseToEdit: Expense | null = null;

export const setExpenseToEdit = (expense: Expense | null) => {
  expenseToEdit = expense;
};

export const getExpenseToEdit = () => {
  return expenseToEdit;
};

export const editExpense = (expense: Expense) => {
  const expenses = getAllExpenses();
  const index = expenses.findIndex((e) => e.id === expense.id);
  if (index !== -1) {
    expenses[index] = expense;
    setExpenseToEdit(null);
    setDataToLocalStorage<Expense[]>("expenses", expenses);
    loadExpenses();
  }
};

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
  expenses.unshift(expense);
  setDataToLocalStorage<Expense[]>("expenses", expenses);
};

export const saveExpense = (event: SubmitEvent) => {
  event.stopImmediatePropagation();
  event.preventDefault();

  if (!$formExpense) {
    console.error("Formulario no encontrado");
    return;
  }
  if (expenseToEdit) {
    editExpense(expenseToEdit);
    return;
  }

  const formData = new FormData($formExpense);

  const newExpense = {
    amount: parseFloat(formData.get("amount") as string),
    category: formData.get("category") as Category,
    detail: formData.get("detail") as string,
    date: new Date().toISOString(),
    id: crypto.randomUUID(),
  };

  const liItems = Array.from($expenseList.children) as HTMLElement[];
  addViewTransitionNameToVariousElements(liItems, "list-item");
  closeModal();
  addExpense(newExpense);
  withTransition(() => {
    addVisualExpense(newExpense);
  });
  removeViewTransitionNameFromVariousElements(liItems);
};

export const filterExpenses = (category: Category) => {
  const expenses = getAllExpenses();
  const filteredExpenses = expenses.filter(
    (expense) => expense.category === category,
  );
  setFilteredExpenses(filteredExpenses);
  loadExpenses();
};

export const deleteExpense = (id: string) => {
  const expenses = getAllExpenses();
  const filteredExpenses = expenses.filter((e) => e.id !== id);
  setDataToLocalStorage<Expense[]>("expenses", filteredExpenses);
  setDataToLocalStorage<Expense[]>("filteredExpenses", filteredExpenses);
  const expense = expenses.find((e) => e.id === id);
  if (!expense) return;
  const liItems = Array.from($expenseList.children) as HTMLElement[];
  addViewTransitionNameToVariousElements(liItems, "list-item");
  withTransition(() => {
    deleteVisualExpense(expense);
  });
  removeViewTransitionNameFromVariousElements(liItems);
};

export const drawExpenses = () => {
  const expenses = getAllExpenses();
  console.log(expenses);
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

  console.log(labels, data, colors);
  generatePieChart(labels, data, colors);
};
