import { describe, it, expect } from 'vitest';
import { formatDateTime } from './general';

describe('General Utils', () => {
  describe('formatDateTime', () => {
    it('should format ISO string to Spanish date format', () => {
      const isoString = '2024-01-15T10:30:00.000Z';
      const result = formatDateTime(isoString);

      expect(result).toContain('enero');
      expect(result).toContain('2024');
      expect(result).toContain('15');
    });

    it('should include time in the format', () => {
      const isoString = '2024-06-20T14:45:00.000Z';
      const result = formatDateTime(isoString);

      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('should handle year-end dates correctly', () => {
      const isoString = '2024-12-31T23:59:59.000Z';
      const result = formatDateTime(isoString);

      expect(result).toContain('diciembre');
      expect(result).toContain('2024');
    });
  });
});
