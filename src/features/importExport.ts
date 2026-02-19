import type { Expense } from "../types/Expense";
import { getDataFromLocalStorage, setDataToLocalStorage } from "../utils/LocalStorage";
import { showSuccess, showError } from "./toast";
import { showLoading, hideLoading } from "./loading";

export const exportData = (format: 'json' | 'csv' = 'json') => {
  showLoading();
  const expenses = getDataFromLocalStorage<Expense[]>('expenses') ?? [];
  
  if (expenses.length === 0) {
    showError('No hay gastos para exportar');
    return;
  }

  let content: string;
  let filename: string;
  let mimeType: string;

  if (format === 'json') {
    content = JSON.stringify(expenses, null, 2);
    filename = `saveit-export-${new Date().toISOString().split('T')[0]}.json`;
    mimeType = 'application/json';
  } else {
    const headers = ['id', 'amount', 'category', 'detail', 'date'];
    const rows = expenses.map(e => 
      [e.id, e.amount, e.category, `"${e.detail.replace(/"/g, '""')}"`, e.date].join(',')
    );
    content = [headers.join(','), ...rows].join('\n');
    filename = `saveit-export-${new Date().toISOString().split('T')[0]}.csv`;
    mimeType = 'text/csv';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  hideLoading();
  showSuccess(`Datos exportados en formato ${format.toUpperCase()}`);
};

export const importData = (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let expenses: Expense[];

        if (file.name.endsWith('.csv')) {
          const lines = content.split('\n').filter(l => l.trim());
          lines.shift(); // Remove headers
          expenses = lines.map(line => {
            const values = line.split(',');
            return {
              id: values[0],
              amount: parseFloat(values[1]),
              category: values[2] as Expense['category'],
              detail: values[3].replace(/^"|"$/g, '').replace(/""/g, '"'),
              date: values[4]
            };
          });
        } else {
          expenses = JSON.parse(content);
        }

        if (!Array.isArray(expenses)) {
          throw new Error('Formato inválido');
        }

        const existingExpenses = getDataFromLocalStorage<Expense[]>('expenses') ?? [];
        const mergedExpenses = [...expenses, ...existingExpenses];
        
        setDataToLocalStorage('expenses', mergedExpenses);
        setDataToLocalStorage('filteredExpenses', mergedExpenses);
        
        showSuccess(`Se importaron ${expenses.length} gastos`);
        hideLoading();
        resolve();
      } catch (error) {
        hideLoading();
        showError('Error al importar: formato inválido');
        reject(error);
      }
    };

    reader.onerror = () => {
      hideLoading();
      showError('Error al leer el archivo');
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsText(file);
  });
};
