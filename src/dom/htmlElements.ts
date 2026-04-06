import {
  drawExpenses,
  getFilteredExpenses,
  setExpenseToEdit,
  confirmDeleteExpense,
} from "../features/expenses";
import { getDataFromLocalStorage } from "../utils/LocalStorage";
import { openModal } from "../features/modal";
import type { Expense } from "../types/Expense";
import type { Income } from "../types/Income";
import { expenseGroups } from "../types/ExpenseGroups";
import { initSwipeExpense, initSwipeIncome, openEditModal, openEditIncomeModal } from "../utils/swipe";
import { confirmDeleteIncome } from "../features/incomes";
import { getCustomCategories } from "../main";
import { createTransactionCardElement } from "../features/transactionCardRenderer";

export const $ = <T extends Element>(query: string) =>
  document.querySelector(query) as T;

const generateCategoryOptions = () => {
  const customCategories = getCustomCategories();
  const customExpenseCategories = customCategories.filter(c => c.type === 'expense');

  const defaultOptions = Object.entries(expenseGroups)
    .map(([key, group]) => `<option value="${key}">${group.label}</option>`)
    .join('');

  const customOptions = customExpenseCategories
    .map(cat => `<option value="custom_${cat.id}">${cat.name} (Personalizado)</option>`)
    .join('');

  return defaultOptions + customOptions;
};

export const loadCategoryOptions = () => {
  const categoryOptions = generateCategoryOptions();
  $selectCategory.innerHTML = categoryOptions;
};

export type TransactionType = 'expense' | 'income';

export const createExpenseElement = (expense: Expense, type: TransactionType = 'expense') => {
  const isIncome = type === 'income';
  const listItem = createTransactionCardElement({
    transaction: expense,
    type,
    variant: 'home',
    customCategories: getCustomCategories(),
    expenseIconMode: 'group',
  });

  if (!isIncome) {
    listItem.addEventListener("click", () => {
      setExpenseToEdit(expense);
      openModal(listItem, expense);
    });

    initSwipeExpense(
      listItem,
      expense,
      (exp) => {
        setExpenseToEdit(exp);
        openEditModal(exp);
      },
      (id) => {
        confirmDeleteExpense(id);
      }
    );
  } else {
    initSwipeIncome(
      listItem,
      expense as unknown as Income,
      (inc) => {
        openEditIncomeModal(inc);
      },
      (id) => {
        confirmDeleteIncome(id);
      }
    );
  }

  return listItem;
};

export const loadExpenses = () => {
  const expenses = getFilteredExpenses();
  const incomes = getDataFromLocalStorage<Income[]>("incomes") || [];
  
  const expenseItems = expenses.map(e => ({ ...e, type: 'expense' as const, sortDate: new Date(e.date).getTime() }));
  const incomeItems = incomes.map(i => ({ ...i, type: 'income' as const, sortDate: new Date(i.date).getTime() }));
  
  const allTransactions = [...expenseItems, ...incomeItems].sort((a, b) => b.sortDate - a.sortDate);
  
  $expenseList.innerHTML = "";
  allTransactions.forEach((transaction, index) => {
    const listItem = createExpenseElement(transaction as Expense, transaction.type);
    listItem.style.viewTransitionName = "list-item-" + index;
    $expenseList.prepend(listItem);
  });
  drawExpenses();
};

export const addVisualExpense = (expense: Expense) => {
  $expenseList.prepend(createExpenseElement(expense));
  drawExpenses();
};

export const deleteVisualExpense = (expense: Expense) => {
  const listItem = $expenseList.querySelector(`[data-id="${expense.id}"]`);
  if (listItem) {
    listItem.remove();
    drawExpenses();
  }
};

export const hideButton = () => {
  $limpiarFiltros.classList.add("hidden");
};

export const showButton = () => {
  $limpiarFiltros.classList.remove("hidden");
};

export const addViewTransitionNameToAnElement = (
  element: HTMLElement,
  name: string,
) => {
  element.style.viewTransitionName = name;
};

export const removeViewTransitionNameFromAnElement = (element: HTMLElement) => {
  setTimeout(() => {
    element.style.viewTransitionName = "";
  }, 500);
};

export const addViewTransitionNameToVariousElements = (
  elements: HTMLElement[],
  name: string,
) => {
  elements.forEach((element, index) => {
    console.log("adding view transition name to element", element);
    addViewTransitionNameToAnElement(element, name + "-" + index);
    element.style.setProperty("view-transition-class", name);
  });
};

export const removeViewTransitionNameFromVariousElements = (
  elements: HTMLElement[],
  time: number = 500,
) => {
  setTimeout(() => {
    console.log("removing view transition name from elements", elements);
    elements.forEach((element) => {
      element.style.viewTransitionName = "";
      element.style.setProperty("view-transition-class", "");
    });
  }, time);
};

export const $limpiarFiltros = $<HTMLButtonElement>("#limpiar-filtros");
export const $selectCategory = $<HTMLSelectElement>("#expense-category");
export const $formExpense = $<HTMLFormElement>("#addExpenseForm");
export const $expenseList = $<HTMLUListElement>("#expenses-list");
export const $modal = $<HTMLDialogElement>("#addExpenseModal");
export const $button = $<HTMLButtonElement>("#agregar-gasto");
export const $cancelBtn = $modal?.querySelector(
  "[data-close]",
) as HTMLButtonElement | null;
