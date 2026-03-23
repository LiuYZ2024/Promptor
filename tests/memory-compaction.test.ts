import { describe, it, expect } from 'vitest';
import {
  mergeRollingSummaries,
  shouldCompressHistory,
  selectMessagesForCompression,
} from '@/lib/memory/compaction';
import type { Message, PinnedFact } from '@/types/data';

function makeMessage(
  id: string,
  content: string,
  stage: Message['stage'] = 'research',
  createdAt?: string,
): Message {
  return {
    id,
    sessionId: 'test-session',
    role: 'user',
    content,
    stage,
    tokenEstimate: Math.ceil(content.length / 4),
    includedInSummary: false,
    createdAt: createdAt ?? new Date().toISOString(),
  };
}

describe('Memory Compaction', () => {
  describe('shouldCompressHistory', () => {
    it('should not compress when under soft limit', () => {
      const messages = [makeMessage('1', 'Hello'), makeMessage('2', 'World')];
      const result = shouldCompressHistory(messages, 100, 6000, 8000);
      expect(result.shouldCompress).toBe(false);
      expect(result.reason).toBe('none');
    });

    it('should advise compression at soft limit', () => {
      const messages = Array.from({ length: 20 }, (_, i) =>
        makeMessage(String(i), `Message ${i}`, 'research', new Date(Date.now() + i * 1000).toISOString()),
      );
      const result = shouldCompressHistory(messages, 6000, 6000, 8000);
      expect(result.shouldCompress).toBe(true);
      expect(result.reason).toBe('soft_limit');
    });

    it('should force compression at hard limit', () => {
      const messages = Array.from({ length: 20 }, (_, i) =>
        makeMessage(String(i), `Message ${i}`, 'research', new Date(Date.now() + i * 1000).toISOString()),
      );
      const result = shouldCompressHistory(messages, 8000, 6000, 8000);
      expect(result.shouldCompress).toBe(true);
      expect(result.reason).toBe('hard_limit');
    });
  });

  describe('selectMessagesForCompression', () => {
    it('should retain recent messages and compress older ones', () => {
      const messages = Array.from({ length: 10 }, (_, i) =>
        makeMessage(String(i), `Message ${i}`, 'research', new Date(Date.now() + i * 1000).toISOString()),
      );
      const result = selectMessagesForCompression(messages, 6);
      expect(result.retainedMessages).toHaveLength(6);
      expect(result.messagesToCompress).toHaveLength(4);
    });

    it('should retain all messages when fewer than window size', () => {
      const messages = [makeMessage('1', 'Hello'), makeMessage('2', 'World')];
      const result = selectMessagesForCompression(messages, 6);
      expect(result.retainedMessages).toHaveLength(2);
      expect(result.messagesToCompress).toHaveLength(0);
    });
  });

  describe('mergeRollingSummaries', () => {
    it('should merge two summaries', () => {
      const existing = 'GOALS:\n- Build auth module\n- Support OAuth';
      const incoming = 'GOALS:\n- Support OAuth\n- Add rate limiting';

      const result = mergeRollingSummaries(existing, incoming);
      expect(result).toContain('Build auth module');
      expect(result).toContain('Add rate limiting');
      // 'Support OAuth' should appear only once (deduplication)
      const count = (result.match(/Support OAuth/g) ?? []).length;
      expect(count).toBe(1);
    });

    it('should remove items that duplicate pinned facts', () => {
      const existing = 'GOALS:\n- Build auth module\n- Must use OAuth2';
      const incoming = '';
      const pinnedFacts: PinnedFact[] = [
        {
          id: '1',
          sessionId: 'test',
          category: 'constraint',
          content: 'Must use OAuth2',
          priority: 'critical',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const result = mergeRollingSummaries(existing, incoming, pinnedFacts);
      expect(result).toContain('Build auth module');
      expect(result).not.toContain('Must use OAuth2');
    });

    it('should handle empty inputs', () => {
      expect(mergeRollingSummaries('', '')).toBe('');
      expect(mergeRollingSummaries('GOALS:\n- One', '')).toContain('One');
    });
  });
});
