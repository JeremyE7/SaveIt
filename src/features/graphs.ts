import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

export const generateChart = (): uPlot => {
  const target = document.getElementById("chart") as HTMLDivElement;

  const options: uPlot.Options = {
    width: 600,
    height: 300,
    series: [
      {},
      {
        label: "Ventas",
        stroke: "blue",
      },
    ],
  };

  const data: uPlot.AlignedData = [
    [1, 2, 3, 4, 5],
    [10, 15, 13, 20, 18],
  ];

  return new uPlot(options, data, target);
};
