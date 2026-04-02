import { Chart, PieController, ArcElement, Tooltip, Legend } from "chart.js";
import { expenseGroups, type ExpenseGroup } from "../types/ExpenseGroups";
import { filterExpenses } from "./expenses";
import { $expenseList, addViewTransitionNameToVariousElements, removeViewTransitionNameFromVariousElements, showButton } from "../dom/htmlElements";
import { withTransition } from "../utils/viewTransitions";
import { showSuccess } from "./toast";
import { getCustomCategories } from "../main";

Chart.register(PieController, ArcElement, Tooltip, Legend);

let chartInstance: Chart | null = null;

const getCategoryLabel = (category: string): string => {
  if (category.startsWith('custom_')) {
    const categoryId = category.replace('custom_', '');
    const customCategories = getCustomCategories();
    const customCat = customCategories.find((c: { id: string; type: string }) => c.id === categoryId && c.type === 'expense');
    if (customCat) return customCat.name;
  }
  const cat = expenseGroups[category as ExpenseGroup];
  return cat?.label || category;
};

export const generatePieChart = (
  labels: string[],
  data: number[],
  colors: string[],
): Chart => {
  const canvas = document.getElementById("chart") as HTMLCanvasElement;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  chartInstance = new Chart(canvas, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: colors,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (_, elements, chart) => {
        if (!elements.length) return;
        showButton();

        const index = elements[0].index;

        const label = chart.data.labels?.[index];
        const liItems = Array.from($expenseList.children) as HTMLElement[];
        addViewTransitionNameToVariousElements(liItems, "list-item");
        withTransition(() => {
          filterExpenses(label as string);
        });
        removeViewTransitionNameFromVariousElements(liItems);
        showSuccess(`Filtrado por: ${getCategoryLabel(label as string)}`);

      },
      plugins: {
        legend: {
          position: "bottom",
          align: "center",
          labels: {
            color: '#94a3b8',
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20,
          },
        },
      },
    },
  });

  return chartInstance;
};

export const destroyChart = () => {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
};
