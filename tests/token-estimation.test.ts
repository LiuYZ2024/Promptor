import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  estimateMessagesTokens,
  calculateContextBudget,
} from '@/lib/token-estimation';

describe('Token Estimation', () => {
  it('should estimate tokens from text length', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('hello')).toBe(2);
    expect(estimateTokens('a'.repeat(100))).toBe(25);
  });

  it('should estimate message tokens with overhead', () => {
    const messages = [
      { content: 'Hello' },
      { content: 'World' },
    ];
    const result = estimateMessagesTokens(messages);
    expect(result).toBeGreaterThan(0);
    expect(result).toBe(2 + 4 + 2 + 4);
  });

  describe('calculateContextBudget', () => {
    it('should report no compression needed under soft limit', () => {
      const budget = calculateContextBudget(3000, 6000, 8000);
      expect(budget.shouldCompress).toBe(false);
      expect(budget.mustCompress).toBe(false);
      expect(budget.usagePercent).toBeCloseTo(37.5);
    });

    it('should advise compression at soft limit', () => {
      const budget = calculateContextBudget(6000, 6000, 8000);
      expect(budget.shouldCompress).toBe(true);
      expect(budget.mustCompress).toBe(false);
    });

    it('should require compression at hard limit', () => {
      const budget = calculateContextBudget(8000, 6000, 8000);
      expect(budget.shouldCompress).toBe(true);
      expect(budget.mustCompress).toBe(true);
      expect(budget.usagePercent).toBe(100);
    });
  });
});
