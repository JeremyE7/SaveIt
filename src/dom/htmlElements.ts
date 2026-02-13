import {
  deleteExpense,
  drawExpenses,
  getFilteredExpenses,
  setExpenseToEdit,
} from "../features/expenses";
import { openModal } from "../features/modal";
import type { Expense } from "../types/Expense";
import { categories } from "../types/Categories";
import { formatDateTime } from "../utils/general";

export const $ = <T extends Element>(query: string) =>
  document.querySelector(query) as T;

const generateCategoryOptions = () => {
  const grouped = Object.entries(categories).reduce(
    (acc, [key, cat]) => {
      if (!acc[cat.group]) acc[cat.group] = [];
      acc[cat.group].push({ key, ...cat }); // Incluye la key
      return acc;
    },
    {} as Record<
      string,
      Array<{ key: string } & (typeof categories)[keyof typeof categories]>
    >,
  );

  return Object.entries(grouped)
    .map(([group, items]) => {
      const options = items
        .map((c) => `<option value="${c.key}">${c.label}</option>`) // Usa c.key
        .join("");
      return `<optgroup label="${group}">${options}</optgroup>`;
    })
    .join("");
};

export const loadCategoryOptions = () => {
  const categoryOptions = generateCategoryOptions();
  $selectCategory.innerHTML = categoryOptions;
};

export const createExpenseElement = (expense: Expense) => {
  const listItem = document.createElement("li");
  listItem.setAttribute("data-id", expense.id.toString());
  const div1 = document.createElement("div");
  const div2 = document.createElement("div");
  const textCategoryName = categories[expense.category].label;
  const h3 = document.createElement("h3");
  const small = document.createElement("small");
  const p = document.createElement("p");
  const span = document.createElement("span");
  const strong = document.createElement("strong");
  h3.textContent = textCategoryName + ": ";
  strong.textContent = expense.amount.toString() + " $";
  span.appendChild(h3);
  span.appendChild(strong);
  small.textContent = formatDateTime(expense.date);
  p.textContent = expense.detail;
  div1.appendChild(span);
  div1.appendChild(small);
  div1.appendChild(p);
  listItem.appendChild(div1);

  const buttonEdit = document.createElement("button");
  buttonEdit.textContent = "Editar";
  buttonEdit.addEventListener("click", () => {
    setExpenseToEdit(expense);
    openModal(listItem, expense);
  });
  const buttonDelete = document.createElement("button");
  buttonDelete.textContent = "Eliminar";
  buttonDelete.addEventListener("click", () => {
    deleteExpense(expense.id);
  });
  div2.appendChild(buttonEdit);
  div2.appendChild(buttonDelete);
  listItem.appendChild(div2);
  return listItem;
};

export const loadExpenses = () => {
  const expenses = getFilteredExpenses();
  $expenseList.innerHTML = "";
  expenses.forEach((expense) => {
    const listItem = createExpenseElement(expense);
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
  });
};

export const removeViewTransitionNameFromVariousElements = (
  elements: HTMLElement[],
) => {
  setTimeout(() => {
    elements.forEach((element) => {
      element.style.viewTransitionName = "";
    });
  }, 500);
};

export const $limpiarFiltros = $<HTMLButtonElement>("#limpiar-filtros");
export const $selectCategory = $<HTMLSelectElement>("#expense-category");
export const $formExpense = $<HTMLFormElement>("#addExpenseForm");
export const $expenseList = $<HTMLUListElement>("#expenses-list");
console.log($formExpense);
export const $modal = $<HTMLDialogElement>("#addExpenseModal");
export const $button = $<HTMLButtonElement>("#agregar-gasto");
export const $cancelBtn = $modal?.querySelector(
  "[data-close]",
) as HTMLButtonElement | null;
