import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDataFromLocalStorage,
  setDataToLocalStorage,
  removeDataFromLocalStorage,
  clearLocalStorage,
} from './LocalStorage';

describe('LocalStorage Utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getDataFromLocalStorage', () => {
    it('should return null when key does not exist', () => {
      const result = getDataFromLocalStorage('nonExistent');
      expect(result).toBeNull();
    });

    it('should return parsed data when key exists', () => {
      const testData = { name: 'test', value: 123 };
      localStorage.setItem('testKey', JSON.stringify(testData));

      const result = getDataFromLocalStorage('testKey');
      expect(result).toEqual(testData);
    });

    it('should return null when data is invalid JSON', () => {
      localStorage.setItem('invalidKey', 'not valid json');

      const result = getDataFromLocalStorage('invalidKey');
      expect(result).toBeNull();
    });

    it('should return array data correctly', () => {
      const testArray = [1, 2, 3, 4, 5];
      localStorage.setItem('arrayKey', JSON.stringify(testArray));

      const result = getDataFromLocalStorage<number[]>('arrayKey');
      expect(result).toEqual(testArray);
    });
  });

  describe('setDataToLocalStorage', () => {
    it('should store data as JSON string', () => {
      const testData = { name: 'test', value: 123 };
      setDataToLocalStorage('newKey', testData);

      const stored = localStorage.getItem('newKey');
      expect(stored).toBe(JSON.stringify(testData));
    });

    it('should overwrite existing data', () => {
      localStorage.setItem('overwriteKey', 'old value');
      setDataToLocalStorage('overwriteKey', 'new value');

      const stored = localStorage.getItem('overwriteKey');
      expect(stored).toBe('"new value"');
    });
  });

  describe('removeDataFromLocalStorage', () => {
    it('should remove data from localStorage', () => {
      localStorage.setItem('toRemove', 'some data');
      removeDataFromLocalStorage('toRemove');

      const result = localStorage.getItem('toRemove');
      expect(result).toBeNull();
    });

    it('should not throw when key does not exist', () => {
      expect(() => removeDataFromLocalStorage('nonExistent')).not.toThrow();
    });
  });

  describe('clearLocalStorage', () => {
    it('should clear all data from localStorage', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');

      clearLocalStorage();

      expect(localStorage.length).toBe(0);
    });
  });
});
