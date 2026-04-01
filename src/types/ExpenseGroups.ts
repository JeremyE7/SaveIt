export const expenseGroups = {
  needs: {
    value: "needs",
    label: "Necesidades",
    description: "Vivienda, comida, transporte, servicios",
    color: "#3B82F6",
    icon: "home",
    defaultPercentage: 50
  },
  wants: {
    value: "wants",
    label: "Deseos",
    description: "Entretenimiento, restaurantes, compras",
    color: "#F59E0B",
    icon: "shopping_bag",
    defaultPercentage: 30
  },
  savings: {
    value: "savings",
    label: "Ahorros",
    description: "Inversiones, emergencias, deudas",
    color: "#10B981",
    icon: "savings",
    defaultPercentage: 20
  }
} as const;

export type ExpenseGroup = keyof typeof expenseGroups;
