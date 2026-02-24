import type { Income } from "../types/Income";
import {
  getDataFromLocalStorage,
  setDataToLocalStorage,
} from "../utils/LocalStorage";

export const getAllIncomes = () => {
  const incomes = getDataFromLocalStorage<Income[]>("incomes");
  return incomes ?? [];
};

export const addIncome = (income: Income) => {
  const incomes = getAllIncomes();
  incomes.unshift(income);
  setDataToLocalStorage<Income[]>("incomes", incomes);
};

export const deleteIncome = (id: string) => {
  const incomes = getAllIncomes();
  const filteredIncomes = incomes.filter((e) => e.id !== id);
  setDataToLocalStorage<Income[]>("incomes", filteredIncomes);
};

export const confirmDeleteIncome = (id: string) => {
  const incomes = getAllIncomes();
  const income = incomes.find((e) => e.id === id);
  if (!income) return;

  const overlay = document.createElement('div');
  overlay.className = 'confirm-popup-overlay';
  overlay.innerHTML = `
    <div class="confirm-popup">
      <div class="confirm-popup-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <h3 class="confirm-popup-title">Eliminar Ingreso</h3>
      <p class="confirm-popup-message">¿Estás seguro de eliminar este ingreso de <strong>${income.amount}$</strong>?</p>
      <div class="confirm-popup-buttons">
        <button class="confirm-popup-btn cancel" data-cancel>Cancelar</button>
        <button class="confirm-popup-btn danger" data-confirm>Eliminar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const handleConfirm = () => {
    cleanup();
    deleteIncome(id);
    const event = new CustomEvent('incomeDeleted');
    window.dispatchEvent(event);
  };

  const handleCancel = () => {
    cleanup();
  };

  const cleanup = () => {
    overlay.remove();
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      handleCancel();
    }
  });

  overlay.querySelector('[data-cancel]')?.addEventListener('click', handleCancel);
  overlay.querySelector('[data-confirm]')?.addEventListener('click', handleConfirm);
};
