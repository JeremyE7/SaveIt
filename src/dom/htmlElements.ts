import {
  drawExpenses,
  getFilteredExpenses,
  setExpenseToEdit,
  confirmDeleteExpense,
} from "../features/expenses";
import { openModal } from "../features/modal";
import type { Expense } from "../types/Expense";
import { categories } from "../types/Categories";
import { initSwipeExpense, openEditModal } from "../utils/swipe";

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
  const listItem = document.createElement("div");
  listItem.setAttribute("data-id", expense.id.toString());
  listItem.className = "expense-item";

  const cat = categories[expense.category];
  const catColor = cat?.color || '#666';

  listItem.innerHTML = `
    <div class="expense-item-left">
      <div class="expense-item-icon" style="background: ${catColor}20; color: ${catColor};">
        <span class="material-symbols-outlined" style="font-size: 20px;">${getCategoryIcon(expense.category)}</span>
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
    <div class="expense-item-amount">-$${expense.amount.toFixed(2)}</div>
  `;

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

  return listItem;
};

const getCategoryIcon = (category: string): string => {
  const iconMap: Record<string, string> = {
    food_home: 'local_grocery_store',
    food_restaurant: 'restaurant',
    transport_public: 'directions_bus',
    transport_fuel: 'local_gas_station',
    transport_taxi: 'local_taxi',
    housing_rent: 'home',
    housing_utilities: 'bolt',
    housing_internet: 'wifi',
    shopping_clothes: 'checkroom',
    shopping_electronics: 'devices',
    health_medicine: 'medication',
    health_doctor: 'medical_services',
    entertainment_streaming: 'smart_display',
    entertainment_games: 'sports_esports',
    education_courses: 'school',
    work_tools: 'build',
    finance_fees: 'account_balance',
    personal_care: 'spa',
    cleaning: 'cleaning_services',
    gifts: 'card_giftcard',
    pets: 'pets',
    travel: 'flight',
    other: 'more_horiz',
  };
  return iconMap[category] || 'receipt';
};

export const loadExpenses = () => {
  const expenses = getFilteredExpenses();
  $expenseList.innerHTML = "";
  expenses.forEach((expense, index) => {
    const listItem = createExpenseElement(expense);
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
