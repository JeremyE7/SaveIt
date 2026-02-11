import { getExpenses } from "../features/expenses";
import { categories } from "../types/Categories";

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

export const loadExpenses = () => {
  const expenses = getExpenses();
  expenses.forEach((expense) => {
    const listItem = document.createElement("li");
    const textCategoryName = categories[expense.category].label;
    listItem.textContent = `${expense.amount} - ${textCategoryName}`;
    $expenseList.appendChild(listItem);
  });
};

export const $selectCategory = $<HTMLSelectElement>("#expense-category");
export const $formExpense = $<HTMLFormElement>("#addExpenseForm");
export const $expenseList = $<HTMLUListElement>("#expenses-list");
console.log($formExpense);
export const $modal = $<HTMLDialogElement>("#addExpenseModal");
export const $button = $<HTMLButtonElement>("#agregar-gasto");
export const $cancelBtn = $modal?.querySelector(
  "[data-close]",
) as HTMLButtonElement | null;
