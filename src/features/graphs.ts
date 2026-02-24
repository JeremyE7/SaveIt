import { Chart, PieController, ArcElement, Tooltip, Legend } from "chart.js";
import { expenseCategories, type ExpenseCategory } from "../types/ExpenseCategories";
import { filterExpenses } from "./expenses";
import { $expenseList, addViewTransitionNameToVariousElements, removeViewTransitionNameFromVariousElements, showButton } from "../dom/htmlElements";
import { withTransition } from "../utils/viewTransitions";
import { showSuccess } from "./toast";

Chart.register(PieController, ArcElement, Tooltip, Legend);

let chartInstance: Chart | null = null;

export const generatePieChart = (
  labels: string[],
  data: number[],
  colors: string[],
): Chart => {
  const canvas = document.getElementById("chart") as HTMLCanvasElement;

  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.data.datasets[0].backgroundColor = colors;
    chartInstance.data.datasets[0].borderColor = colors;
    chartInstance.update();
    return chartInstance;
  }

  chartInstance = new Chart(canvas, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
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
          filterExpenses(label as unknown as ExpenseCategory);
        });
        removeViewTransitionNameFromVariousElements(liItems);
          showSuccess(`Filtrado por: ${expenseCategories[label as keyof typeof expenseCategories].label}`);

      },
      plugins: {
        legend: {
          position: "bottom",
          align: "center",
          labels: {
            generateLabels: (chart) => {
              const data = chart.data;

              if (!data.labels) return [];

              return data.labels.map((label, i) => ({
                text: expenseCategories[label as keyof typeof expenseCategories].label,
                fillStyle: expenseCategories[label as keyof typeof expenseCategories].color,
                fontColor: expenseCategories[label as keyof typeof expenseCategories].color,
                hidden: false,
                index: i,
              }));
            },
            usePointStyle: true,
            padding: 20,
          },
        },
      },
    },
  });

  return chartInstance;
};
