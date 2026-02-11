import { Chart, PieController, ArcElement, Tooltip, Legend } from "chart.js";
import { categories, type Category } from "../types/Categories";
import { filterExpenses } from "./expenses";
import { showButton } from "../dom/htmlElements";

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
        const filteredData = filterExpenses(label as unknown as Category);

        console.log(filteredData);
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
                text: categories[label as keyof typeof categories].label,
                fillStyle: categories[label as keyof typeof categories].color,
                fontColor: categories[label as keyof typeof categories].color,
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
