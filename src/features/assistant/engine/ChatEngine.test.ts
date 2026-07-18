import { describe, expect, it } from 'vitest';
import { ChatEngine, detectDataIntent, findKnowledgeMatches } from './ChatEngine';
import { UNKNOWN_ANSWER } from '../knowledge/finloKnowledge';

describe('ChatEngine', () => {
  it('matches Finlo knowledge for product questions', () => {
    const matches = findKnowledgeMatches('How do I mark a recurring payment paid?');
    expect(matches[0]?.article.id).toBe('workflow-mark-paid');
  });

  it('detects personal data intents', () => {
    expect(detectDataIntent('What is my account balance?')?.intent).toBe('balance');
    expect(detectDataIntent('How much did I spend this month?')?.intent).toBe('spending');
    expect(detectDataIntent('Explain debt avalanche')?.intent ?? null).toBeNull();
  });

  it('returns unknown when nothing matches', async () => {
    const reply = await ChatEngine.answer({
      query: 'What is the capital of Mars pizza recipes xyzzy?',
      currency: 'USD'
    });
    expect(reply.source).toBe('unknown');
    expect(reply.content).toBe(UNKNOWN_ANSWER);
  });
});
