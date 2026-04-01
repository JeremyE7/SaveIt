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
import { expenseGroups, type ExpenseGroup } from "../types/ExpenseGroups";
import { incomeCategories } from "../types/IncomeCategories";
import { initSwipeExpense, initSwipeIncome, openEditModal, openEditIncomeModal } from "../utils/swipe";
import { confirmDeleteIncome } from "../features/incomes";
import { getCustomCategories } from "../main";

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

const getCategoryIcon = (category: string): string => {
  if (category.startsWith('custom_')) {
    const categoryId = category.replace('custom_', '');
    const customCategories = getCustomCategories();
    const customCat = customCategories.find(c => c.id === categoryId && c.type === 'expense');
    return customCat?.icon || 'category';
  }
  return expenseGroups[category as ExpenseGroup]?.icon || 'receipt';
};

export const createExpenseElement = (expense: Expense, type: TransactionType = 'expense') => {
  const listItem = document.createElement("div");
  listItem.setAttribute("data-id", expense.id.toString());
  listItem.setAttribute("data-type", type);
  listItem.className = "expense-item";

  const isIncome = type === 'income';
  let cat: { label?: string; color?: string } | undefined;
  let catIcon: string;
  let catColor: string;

  if (isIncome) {
    const customCategories = getCustomCategories();
    const categoryId = expense.category.replace('custom_', '');
    const customCat = customCategories.find(c => c.id === categoryId && c.type === 'income');
    if (customCat) {
      cat = { label: customCat.name, color: customCat.color };
      catIcon = customCat.icon;
    } else {
      const incomeCatKey = expense.category as keyof typeof incomeCategories;
      cat = incomeCategories[incomeCatKey];
      catIcon = getIncomeCategoryIcon(expense.category);
    }
  } else {
    const customCategories = getCustomCategories();
    const categoryId = expense.category.replace('custom_', '');
    const customCat = customCategories.find(c => c.id === categoryId && c.type === 'expense');
    if (customCat) {
      cat = { label: customCat.name, color: customCat.color };
      catIcon = customCat.icon;
    } else {
      const expenseCatKey = expense.category as ExpenseGroup;
      cat = expenseGroups[expenseCatKey];
      catIcon = getCategoryIcon(expense.category);
    }
  }

  catColor = cat?.color || '#666';
  const arrowSymbol = isIncome ? '↑' : '↓';
  const amountPrefix = isIncome ? '+' : '-';
  const amountClass = isIncome ? 'expense-item-amount income' : 'expense-item-amount';

  listItem.innerHTML = `
    <div class="expense-item-left">
      <div class="expense-item-icon" style="background: ${catColor}20; color: ${catColor};">
        <span class="material-symbols-outlined" style="font-size: 20px;">${catIcon}</span>
      </div>
      <div class="expense-item-details">
        <div class="expense-item-title-row">
          <p class="expense-item-title">${expense.detail || cat?.label || expense.category}</p>
        </div>
        <div class="expense-item-category-badge">
          <span class="badge-dot" style="background: ${catColor};"></span>
          ${cat?.label || expense.category}
        </div>
      </div>
    </div>
    <div class="${amountClass}"><span class="expense-item-arrow">${arrowSymbol}</span>${amountPrefix}$${expense.amount.toFixed(2)}</div>
  `;

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

const getIncomeCategoryIcon = (category: string): string => {
  const iconMap: Record<string, string> = {
    salary: 'payments',
    freelance: 'laptop_mac',
    bonus: 'stars',
    investment: 'trending_up',
    gift: 'card_giftcard',
    other_income: 'attach_money',
  };
  return iconMap[category] || 'attach_money';
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
