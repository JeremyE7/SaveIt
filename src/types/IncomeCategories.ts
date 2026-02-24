export const incomeCategories = {
  salary: {
    value: "Salary",
    label: "Sueldo",
    color: "#22c55e",
  },
  freelance: {
    value: "Freelance",
    label: "Freelance",
    color: "#14b8a6",
  },
  bonus: {
    value: "Bonus",
    label: "Bonificación",
    color: "#3b82f6",
  },
  investment: {
    value: "Investment",
    label: "Inversiones",
    color: "#8b5cf6",
  },
  gift: {
    value: "Gift",
    label: "Regalo",
    color: "#ec4899",
  },
  other_income: {
    value: "OtherIncome",
    label: "Otro",
    color: "#6366f1",
  },
} as const;

export type IncomeCategory = keyof typeof incomeCategories;
