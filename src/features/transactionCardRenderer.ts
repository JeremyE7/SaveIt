import { expenseGroups, type ExpenseGroup } from "../types/ExpenseGroups";
import { incomeCategories, type IncomeCategory } from "../types/IncomeCategories";

export type TransactionCardType = "expense" | "income";
export type TransactionCardVariant = "home" | "stats";

export type CustomCategory = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionCardType;
};

type TransactionCardData = {
  id: string;
  amount: number;
  category: string;
  detail: string;
  source?: string;
};

type ExpenseIconMode = "group" | "legacy";

export type RenderTransactionCardOptions = {
  transaction: TransactionCardData;
  type: TransactionCardType;
  variant: TransactionCardVariant;
  customCategories: CustomCategory[];
  metaText?: string;
  expenseIconMode?: ExpenseIconMode;
};

const incomeIconMap: Record<string, string> = {
  salary: "payments",
  freelance: "laptop_mac",
  bonus: "stars",
  investment: "trending_up",
  gift: "card_giftcard",
  other_income: "attach_money",
};

const legacyIconMap: Record<string, string> = {
  food_home: "local_grocery_store",
  food_restaurant: "restaurant",
  transport_public: "directions_bus",
  transport_fuel: "local_gas_station",
  transport_taxi: "local_taxi",
  housing_rent: "home",
  housing_utilities: "bolt",
  housing_internet: "wifi",
  shopping_clothes: "checkroom",
  shopping_electronics: "devices",
  health_medicine: "medication",
  health_doctor: "medical_services",
  entertainment_streaming: "smart_display",
  entertainment_games: "sports_esports",
  education_courses: "school",
  work_tools: "build",
  finance_fees: "account_balance",
  personal_care: "spa",
  cleaning: "cleaning_services",
  gifts: "card_giftcard",
  pets: "pets",
  travel: "flight",
  other: "more_horiz",
  salary: "payments",
  freelance: "laptop_mac",
  bonus: "stars",
  investment: "trending_up",
  gift: "card_giftcard",
  other_income: "attach_money",
};

type ResolvedCategory = {
  label: string;
  color: string;
  icon: string;
};

const resolveCategory = (
  category: string,
  type: TransactionCardType,
  customCategories: CustomCategory[],
  variant: TransactionCardVariant,
  expenseIconMode: ExpenseIconMode,
): ResolvedCategory => {
  if (category.startsWith("custom_")) {
    const categoryId = category.replace("custom_", "");
    const customCat = customCategories.find(
      (cat) => cat.id === categoryId && cat.type === type,
    );

    if (customCat) {
      return {
        label: customCat.name,
        color: customCat.color,
        icon: customCat.icon || "category",
      };
    }
  }

  if (type === "expense") {
    const expenseCategory = expenseGroups[category as ExpenseGroup];
    return {
      label: expenseCategory?.label || category,
      color: expenseCategory?.color || "#666",
      icon:
        expenseIconMode === "legacy"
          ? legacyIconMap[category] || "receipt"
          : expenseCategory?.icon || "receipt",
    };
  }

  const incomeCategory = incomeCategories[category as IncomeCategory];
  const fallbackIncomeIcon = variant === "stats" ? "receipt" : "attach_money";

  return {
    label: incomeCategory?.label || category,
    color: incomeCategory?.color || "#22c55e",
    icon: incomeIconMap[category] || fallbackIncomeIcon,
  };
};

const renderAmount = (
  amount: number,
  type: TransactionCardType,
  variant: TransactionCardVariant,
): string => {
  const amountClass =
    type === "income" ? "expense-item-amount income" : "expense-item-amount";
  const amountPrefix = type === "income" ? "+" : "-";
  const arrowSymbol = type === "income" ? "↑" : "↓";

  if (variant === "home") {
    return `<div class="${amountClass}"><span class="expense-item-arrow">${arrowSymbol}</span>${amountPrefix}$${amount.toFixed(2)}</div>`;
  }

  return `<div class="${amountClass}">${amountPrefix}$${amount.toFixed(2)}</div>`;
};

const renderCardBody = (options: RenderTransactionCardOptions): string => {
  const { transaction, type, variant, customCategories, metaText, expenseIconMode = "group" } =
    options;
  const resolvedCategory = resolveCategory(
    transaction.category,
    type,
    customCategories,
    variant,
    expenseIconMode,
  );
  const sourceBadge =
    type === "expense" && transaction.source === "subscription"
      ? '<span class="transaction-source-badge">Suscripción</span>'
      : "";
  const title = transaction.detail || resolvedCategory.label || transaction.category;
  const useTitleRow = type === "expense" || variant === "home";

  return `
    <div class="expense-item-left">
      <div class="expense-item-icon" style="background: ${resolvedCategory.color}20; color: ${resolvedCategory.color};">
        <span class="material-symbols-outlined" style="font-size: 20px;">${resolvedCategory.icon}</span>
      </div>
      <div class="expense-item-details">
        ${
          useTitleRow
            ? `<div class="expense-item-title-row"><p class="expense-item-title">${title}</p>${sourceBadge}</div>`
            : `<p class="expense-item-title">${title}</p>`
        }
        <div class="expense-item-category-badge">
          <span class="badge-dot" style="background: ${resolvedCategory.color};"></span>
          ${resolvedCategory.label}
        </div>
        ${metaText ? `<p class="stats-transaction-meta">${metaText}</p>` : ""}
      </div>
    </div>
    ${renderAmount(transaction.amount, type, variant)}
  `;
};

export const createTransactionCardElement = (
  options: RenderTransactionCardOptions,
): HTMLDivElement => {
  const card = document.createElement("div");
  card.className =
    options.variant === "stats"
      ? "expense-item stats-transaction-item"
      : "expense-item";
  card.setAttribute("data-id", String(options.transaction.id));
  card.setAttribute("data-type", options.type);
  card.innerHTML = renderCardBody(options);
  return card;
};

export const renderTransactionCardHtml = (
  options: RenderTransactionCardOptions,
): string => {
  return createTransactionCardElement(options).outerHTML;
};
