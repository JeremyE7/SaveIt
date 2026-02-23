import { describe, it, expect, beforeEach } from 'vitest';
import {
  getBudgets,
  setBudgets,
  addBudget,
  removeBudget,
  checkBudgetAlerts,
  type Budget,
} from './budgets';

describe('Budgets', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getBudgets', () => {
    it('should return empty array when no budgets exist', () => {
      const result = getBudgets();
      expect(result).toEqual([]);
    });

    it('should return stored budgets', () => {
      const budgets: Budget[] = [
        { category: 'food', amount: 500, period: 'monthly' },
      ];
      localStorage.setItem('budgets', JSON.stringify(budgets));

      const result = getBudgets();
      expect(result).toEqual(budgets);
    });
  });

  describe('setBudgets', () => {
    it('should store budgets in localStorage', () => {
      const budgets: Budget[] = [
        { category: 'food', amount: 500, period: 'monthly' },
      ];
      setBudgets(budgets);

      const stored = localStorage.getItem('budgets');
      expect(JSON.parse(stored!)).toEqual(budgets);
    });
  });

  describe('addBudget', () => {
    it('should add new budget', () => {
      const budget: Budget = { category: 'food', amount: 500, period: 'monthly' };
      addBudget(budget);

      const result = getBudgets();
      expect(result).toContainEqual(budget);
    });

    it('should update existing budget for same category', () => {
      const budget1: Budget = { category: 'food', amount: 500, period: 'monthly' };
      const budget2: Budget = { category: 'food', amount: 1000, period: 'weekly' };

      addBudget(budget1);
      addBudget(budget2);

      const result = getBudgets();
      expect(result.length).toBe(1);
      expect(result[0].amount).toBe(1000);
    });
  });

  describe('removeBudget', () => {
    it('should remove budget by category', () => {
      const budgets: Budget[] = [
        { category: 'food', amount: 500, period: 'monthly' },
        { category: 'transport', amount: 200, period: 'monthly' },
      ];
      setBudgets(budgets);

      removeBudget('food');

      const result = getBudgets();
      expect(result.length).toBe(1);
      expect(result[0].category).toBe('transport');
    });
  });

  describe('checkBudgetAlerts', () => {
    it('should return empty array when no budgets exist', () => {
      const expenses = [{ category: 'food', amount: 100, date: new Date().toISOString() }];
      const alerts = checkBudgetAlerts(expenses);
      expect(alerts).toEqual([]);
    });

    it('should not trigger alert when under 80% threshold', () => {
      const budgets: Budget[] = [
        { category: 'food', amount: 1000, period: 'monthly' },
      ];
      setBudgets(budgets);

      const expenses = [
        { category: 'food', amount: 100, date: new Date().toISOString() },
      ];
      const alerts = checkBudgetAlerts(expenses);

      expect(alerts).toEqual([]);
    });

    it('should trigger alert when over 80% threshold', () => {
      const budgets: Budget[] = [
        { category: 'food', amount: 100, period: 'monthly' },
      ];
      setBudgets(budgets);

      const expenses = [
        { category: 'food', amount: 90, date: new Date().toISOString() },
      ];
      const alerts = checkBudgetAlerts(expenses);

      expect(alerts.length).toBe(1);
      expect(alerts[0].category).toBe('food');
      expect(alerts[0].percentage).toBe(90);
    });

    it('should only check expenses within the period', () => {
      const budgets: Budget[] = [
        { category: 'food', amount: 100, period: 'weekly' },
      ];
      setBudgets(budgets);

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30);
      const expenses = [
        { category: 'food', amount: 100, date: oldDate.toISOString() },
      ];
      const alerts = checkBudgetAlerts(expenses);

      expect(alerts).toEqual([]);
    });
  });
});
