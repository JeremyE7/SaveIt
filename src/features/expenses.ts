import type { Expense } from "../types/Expense";
import {
  $expenseList,
  $formExpense,
  addViewTransitionNameToVariousElements,
  addVisualExpense,
  deleteVisualExpense,
  hideButton,
  loadExpenses,
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
import { showSuccess, showError } from "./toast";

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
  hideButton();

  const liItems = Array.from($expenseList.children) as HTMLElement[];
  addViewTransitionNameToVariousElements(liItems, "list-item");
  withTransition(() => {
    loadExpenses();
  });
  removeViewTransitionNameFromVariousElements(liItems);
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
    showError("Formulario no encontrado");
    return;
  }

  const formData = new FormData($formExpense);

  const amount = parseFloat(formData.get("amount") as string);
  const detail = (formData.get("detail") as string).trim();

  if (!detail) {
    showError("Ingresa los detalles del gasto");
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showError("Ingresa un monto válido");
    return;
  }

  if (expenseToEdit) {
    editExpense({ ...expenseToEdit, amount, detail, category: formData.get("category") as Category });
    showSuccess("Gasto actualizado");
    return;
  }

  const newExpense = {
    amount,
    category: formData.get("category") as Category,
    detail,
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
  showSuccess("Gasto guardado");
};

export const filterExpenses = (category: Category) => {
  const expenses = getAllExpenses();
  const filteredExpenses = expenses.filter(
    (expense) => expense.category === category,
  );
  setFilteredExpenses(filteredExpenses);
  loadExpenses();
};

export type PeriodFilter = 'all' | 'week' | 'month' | 'year';

export const filterByDateRange = (
  startDate: string | null,
  endDate: string | null,
  period: PeriodFilter = 'all',
) => {
  let expenses = getAllExpenses();
  const now = new Date();

  if (period !== 'all') {
    let start: Date;
    switch (period) {
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
    }
    if (start) {
      expenses = expenses.filter((e) => new Date(e.date) >= start);
    }
  }

  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    expenses = expenses.filter((e) => new Date(e.date) >= start);
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    expenses = expenses.filter((e) => new Date(e.date) <= end);
  }

  setFilteredExpenses(expenses);
  loadExpenses();
};

export const confirmDeleteExpense = (id: string) => {
  const expenses = getAllExpenses();
  const expense = expenses.find((e) => e.id === id);
  if (!expense) return;

  const confirmed = window.confirm(
    `¿Estás seguro de eliminar este gasto de ${expense.amount}$?`,
  );

  if (confirmed) {
    deleteExpense(id);
    showSuccess('Gasto eliminado');
  }
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
