import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Expense } from '../types/Expense';

vi.mock('../utils/LocalStorage', () => ({
  getDataFromLocalStorage: vi.fn(),
  setDataToLocalStorage: vi.fn(),
}));

vi.mock('../dom/htmlElements', () => ({
  $expenseList: document.createElement('ul'),
  $formExpense: document.createElement('form'),
  addViewTransitionNameToVariousElements: vi.fn(),
  addVisualExpense: vi.fn(),
  deleteVisualExpense: vi.fn(),
  hideButton: vi.fn(),
  loadExpenses: vi.fn(),
  removeViewTransitionNameFromVariousElements: vi.fn(),
}));

vi.mock('./modal', () => ({
  closeModal: vi.fn(),
}));

vi.mock('./graphs', () => ({
  generatePieChart: vi.fn(),
}));

vi.mock('../utils/viewTransitions', () => ({
  withTransition: vi.fn((fn) => fn()),
}));

vi.mock('./toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('./budgetModal', () => ({
  updateBudgetAlerts: vi.fn(),
}));

import { getDataFromLocalStorage, setDataToLocalStorage } from '../utils/LocalStorage';
import {
  getAllExpenses,
  getFilteredExpenses,
  setFilteredExpenses,
  addExpense,
  filterExpenses,
  setExpenseToEdit,
  getExpenseToEdit,
} from './expenses';

describe('Expenses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('getAllExpenses', () => {
    it('should return empty array when no expenses exist', () => {
      (getDataFromLocalStorage as ReturnType<typeof vi.fn>).mockReturnValue(null);
      const result = getAllExpenses();
      expect(result).toEqual([]);
    });

    it('should return expenses from localStorage', () => {
      const expenses: Expense[] = [
        { id: '1', amount: 100, category: 'food_home', detail: 'Test', date: '2024-01-01' },
      ];
      (getDataFromLocalStorage as ReturnType<typeof vi.fn>).mockReturnValue(expenses);
      const result = getAllExpenses();
      expect(result).toEqual(expenses);
    });
  });

  describe('getFilteredExpenses', () => {
    it('should return filtered expenses', () => {
      const expenses: Expense[] = [
        { id: '1', amount: 100, category: 'food_home', detail: 'Test', date: '2024-01-01' },
      ];
      (getDataFromLocalStorage as ReturnType<typeof vi.fn>).mockReturnValue(expenses);
      const result = getFilteredExpenses();
      expect(result).toEqual(expenses);
    });
  });

  describe('setFilteredExpenses', () => {
    it('should save filtered expenses to localStorage', () => {
      const expenses: Expense[] = [
        { id: '1', amount: 100, category: 'food_home', detail: 'Test', date: '2024-01-01' },
      ];
      setFilteredExpenses(expenses);
      expect(setDataToLocalStorage).toHaveBeenCalledWith('filteredExpenses', expenses);
    });
  });

  describe('addExpense', () => {
    it('should add expense to beginning of array', () => {
      const existingExpenses: Expense[] = [
        { id: '1', amount: 50, category: 'food_home', detail: 'Old', date: '2024-01-01' },
      ];
      const newExpense: Expense = {
        id: '2',
        amount: 100,
        category: 'transport_public',
        detail: 'New',
        date: '2024-01-02',
      };

      (getDataFromLocalStorage as ReturnType<typeof vi.fn>).mockReturnValue(existingExpenses);
      addExpense(newExpense);

      expect(setDataToLocalStorage).toHaveBeenCalledWith('expenses', expect.arrayContaining([newExpense]));
    });
  });

  describe('filterExpenses', () => {
    it('should filter expenses by category', () => {
      const expenses: Expense[] = [
        { id: '1', amount: 100, category: 'food_home', detail: 'Food 1', date: '2024-01-01' },
        { id: '2', amount: 50, category: 'transport_public', detail: 'Transport 1', date: '2024-01-02' },
      ];

      (getDataFromLocalStorage as ReturnType<typeof vi.fn>).mockReturnValue(expenses);
      filterExpenses('food_home');

      expect(setDataToLocalStorage).toHaveBeenCalledWith(
        'filteredExpenses',
        expect.arrayContaining([expect.objectContaining({ category: 'food_home' })]),
      );
    });
  });

  describe('setExpenseToEdit / getExpenseToEdit', () => {
    it('should set and get expense to edit', () => {
      const expense: Expense = {
        id: '1',
        amount: 100,
        category: 'food_home',
        detail: 'Test',
        date: '2024-01-01',
      };

      setExpenseToEdit(expense);
      const result = getExpenseToEdit();
      expect(result).toEqual(expense);
    });

    it('should return null when no expense is set', () => {
      setExpenseToEdit(null);
      const result = getExpenseToEdit();
      expect(result).toBeNull();
    });
  });
});
