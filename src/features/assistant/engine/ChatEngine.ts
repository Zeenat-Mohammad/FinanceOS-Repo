import { FINLO_KNOWLEDGE, UNKNOWN_ANSWER, type KnowledgeArticle } from '../knowledge/finloKnowledge';
import { retrieveRagAnswer, type RagSource } from './RagRetriever';
import { AssistantRepository, type AssistantDataSnapshot } from '@/data/repositories/AssistantRepository';

export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  source?: 'knowledge' | 'data' | 'unknown' | 'greeting';
  relatedRoutes?: string[];
  articleId?: string;
  sources?: RagSource[];
  confidence?: number;
};

export type DataIntent =
  | 'balance'
  | 'spending'
  | 'income'
  | 'cashflow'
  | 'debt'
  | 'upcoming'
  | 'overdue'
  | 'recurring_summary'
  | 'accounts_list'
  | 'transactions_count';

type IntentMatch = { intent: DataIntent; score: number };

const DATA_INTENTS: Array<{ intent: DataIntent; patterns: RegExp[] }> = [
  {
    intent: 'balance',
    patterns: [
      /\b(my|our)?\s*(total\s+)?(balance|balances|net\s+cash\s+on\s+hand)\b/i,
      /\bhow\s+much\s+(do\s+i|money)\s+have\b/i,
      /\baccount\s+balance\b/i
    ]
  },
  {
    intent: 'accounts_list',
    patterns: [/\b(list|show)\s+(my\s+)?accounts\b/i, /\bwhat\s+accounts\b/i]
  },
  {
    intent: 'spending',
    patterns: [
      /\b(how\s+much\s+(did\s+i|have\s+i)\s+spend|spending|expenses?|spent)\b/i,
      /\b(this|current)\s+month.*(spend|expense)/i
    ]
  },
  {
    intent: 'income',
    patterns: [/\b(my\s+)?income\b/i, /\bhow\s+much\s+(did\s+i|have\s+i)\s+(earn|make)\b/i]
  },
  {
    intent: 'cashflow',
    patterns: [/\b(cash\s*flow|net\s+cash|surplus|deficit)\b/i]
  },
  {
    intent: 'debt',
    patterns: [/\b(my\s+)?(total\s+)?debt\b/i, /\bhow\s+much\s+(do\s+i\s+)?owe\b/i, /\bloans?\b/i]
  },
  {
    intent: 'upcoming',
    patterns: [
      /\b(upcoming|due\s+soon|next\s+(bill|payment|payments)|what('?s| is)\s+due)\b/i,
      /\bpayments?\s+(this|next)\s+week\b/i
    ]
  },
  {
    intent: 'overdue',
    patterns: [/\boverdue\b/i, /\blate\s+(bills?|payments?)\b/i]
  },
  {
    intent: 'recurring_summary',
    patterns: [/\b(my\s+)?(recurring|subscriptions?|monthly\s+commitments?)\b/i]
  },
  {
    intent: 'transactions_count',
    patterns: [/\bhow\s+many\s+transactions\b/i, /\btransaction\s+count\b/i]
  }
];

function normalize(text: string) {
  return text.toLowerCase().replace(/[^\w\s+/.-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function scoreArticle(query: string, article: KnowledgeArticle): number {
  const q = normalize(query);
  const stop = new Set(['the', 'and', 'for', 'how', 'what', 'when', 'where', 'who', 'why', 'does', 'did', 'can', 'you', 'your', 'with', 'from', 'this', 'that', 'have', 'has', 'are', 'is', 'my', 'our', 'about']);
  const tokens = q.split(' ').filter((t) => t.length > 2 && !stop.has(t));
  let score = 0;
  let strongPhraseHits = 0;
  let contentTokenHits = 0;

  const title = normalize(article.title);
  if (title === q) score += 14;
  if (tokens.length && tokens.every((t) => title.includes(t))) score += 4;

  for (const keyword of article.keywords) {
    const k = normalize(keyword);
    if (!k) continue;
    if (q.includes(k)) {
      const words = k.split(' ').filter(Boolean).length;
      if (words >= 3) {
        score += 8;
        strongPhraseHits += 1;
      } else if (words === 2) {
        score += 4;
        strongPhraseHits += 1;
      } else if (k.length > 4) {
        score += 2.5;
        strongPhraseHits += 1;
      }
    }
  }

  const haystack = `${title} ${article.keywords.map(normalize).join(' ')}`;
  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += 1.1;
      contentTokenHits += 1;
    }
  }

  if (/\bhow\s+(do\s+i|to|can\s+i)\b/i.test(query) && article.topic === 'workflow') {
    score += 3;
  }

  // Reject weak matches that only hit generic phrases like "what is"
  if (strongPhraseHits === 0 && contentTokenHits === 0) return 0;
  if (contentTokenHits === 0 && strongPhraseHits <= 1 && score < 6) return 0;

  return score;
}

export function findKnowledgeMatches(query: string, limit = 3): Array<{ article: KnowledgeArticle; score: number }> {
  const MIN_SCORE = 5;
  return FINLO_KNOWLEDGE.map((article) => ({ article, score: scoreArticle(query, article) }))
    .filter((row) => row.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function detectDataIntent(query: string): IntentMatch | null {
  const possessive = /\b(my|our|i|me|mine)\b/i.test(query) || /\b(this|current)\s+month\b/i.test(query);
  let best: IntentMatch | null = null;

  for (const entry of DATA_INTENTS) {
    for (const pattern of entry.patterns) {
      if (pattern.test(query)) {
        const score = possessive ? 10 : 6;
        if (!best || score > best.score) best = { intent: entry.intent, score };
      }
    }
  }

  // Prefer data only when the user is clearly asking about their situation,
  // or when the pattern is strongly data-specific (owe, spent, etc.)
  if (!best) return null;
  if (best.score < 8 && !possessive && !/\b(owe|spent|earn|balance|upcoming|overdue)\b/i.test(query)) {
    return null;
  }
  return best;
}

function formatDataAnswer(intent: DataIntent, snapshot: AssistantDataSnapshot): string {
  const money = (n: number) => AssistantRepository.formatMoney(n, snapshot.currency);

  switch (intent) {
    case 'balance':
      if (snapshot.accountCount === 0) {
        return 'I could not find any accounts yet. Add an account under Accounts, then ask again.';
      }
      return [
        `Your combined account balance is **${money(snapshot.totalBalance)}** across ${snapshot.accountCount} account${snapshot.accountCount === 1 ? '' : 's'}.`,
        snapshot.accounts.length
          ? snapshot.accounts.map((a) => `• ${a.name}: ${money(a.balance)}`).join('\n')
          : ''
      ]
        .filter(Boolean)
        .join('\n');

    case 'accounts_list':
      if (snapshot.accounts.length === 0) return 'No accounts found in your household yet.';
      return `Here are your accounts:\n${snapshot.accounts.map((a) => `• ${a.name}: ${money(a.balance)}`).join('\n')}`;

    case 'spending':
      return `In **${snapshot.monthLabel}**, you spent **${money(snapshot.expenses)}** across ${snapshot.transactionCount} transaction${snapshot.transactionCount === 1 ? '' : 's'}.`;

    case 'income':
      return `In **${snapshot.monthLabel}**, your income was **${money(snapshot.income)}**.`;

    case 'cashflow':
      return [
        `Cash flow for **${snapshot.monthLabel}**:`,
        `• Income: ${money(snapshot.income)}`,
        `• Expenses: ${money(snapshot.expenses)}`,
        `• Net cash: **${money(snapshot.netCash)}**`
      ].join('\n');

    case 'debt':
      if (snapshot.debtCount === 0) {
        return 'I do not see any active debts in Debt Center. If you have loans or cards, add them under Debt.';
      }
      return [
        `You have **${snapshot.debtCount}** active debt${snapshot.debtCount === 1 ? '' : 's'} totaling **${money(snapshot.totalDebt)}**.`,
        `Scheduled monthly debt payments are about **${money(snapshot.monthlyDebtPayment)}**.`,
        'Open Debt Center for snowball/avalanche simulations.'
      ].join('\n');

    case 'upcoming':
      if (snapshot.upcomingPayments.length === 0) {
        return 'No upcoming recurring payments in the next 14 days. Add rules under Recurring if you expect bills soon.';
      }
      return [
        'Upcoming recurring payments (next 14 days):',
        ...snapshot.upcomingPayments.map(
          (p) => `• ${p.name} — ${money(p.amount)} on ${p.date} (${p.status})`
        )
      ].join('\n');

    case 'overdue':
      if (snapshot.overduePayments.length === 0) return 'Good news — nothing looks overdue right now.';
      return [
        'Overdue payments:',
        ...snapshot.overduePayments.map((p) => `• ${p.name} — ${money(p.amount)} (was due ${p.date})`)
      ].join('\n');

    case 'recurring_summary':
      if (snapshot.activeRecurring === 0) {
        return 'You do not have active recurring rules yet. Create one under Recurring to track bills and subscriptions.';
      }
      return [
        `You have **${snapshot.activeRecurring}** active recurring item${snapshot.activeRecurring === 1 ? '' : 's'}.`,
        `Estimated monthly recurring income: **${money(snapshot.monthlyRecurringIncome)}**`,
        `Estimated monthly recurring expenses: **${money(snapshot.monthlyRecurringExpense)}**`
      ].join('\n');

    case 'transactions_count':
      return `You have **${snapshot.transactionCount}** transaction${snapshot.transactionCount === 1 ? '' : 's'} recorded in **${snapshot.monthLabel}**.`;

    default:
      return UNKNOWN_ANSWER;
  }
}

export type ChatReply = {
  content: string;
  source: ChatMessage['source'];
  relatedRoutes?: string[];
  articleId?: string;
  sources?: RagSource[];
  confidence?: number;
};

export const ChatEngine = {
  greeting(): ChatReply {
    return {
      source: 'greeting',
      content:
        "Hi — I'm the Finlo Chatbot. Ask me about product workflows (Recurring, Calendar, Debt, Forecast), financial terms, or your live data (balances, spending, upcoming bills). If I don't know, I'll say so."
    };
  },

  async answer(params: {
    query: string;
    householdId?: string;
    userId?: string;
    currency: string;
  }): Promise<ChatReply> {
    const query = params.query.trim();
    if (!query) {
      return { source: 'unknown', content: 'Please type a question about Finlo or your finances.' };
    }

    const dataIntent = detectDataIntent(query);
    if (dataIntent && params.householdId && params.userId) {
      try {
        const snapshot = await AssistantRepository.getSnapshot(params.householdId, params.userId, params.currency);
        return {
          source: 'data',
          content: formatDataAnswer(dataIntent.intent, snapshot),
          relatedRoutes: relatedRoutesForIntent(dataIntent.intent),
          confidence: 0.94,
          sources: [
            {
              id: 'live-household-snapshot',
              title: 'Live Finlo household snapshot',
              excerpt: 'Accounts, current-month transactions, active debts, and recurring instances retrieved for the authenticated household.',
              sourcePath: 'Supabase household ledger',
              similarity: 0.94
            }
          ]
        };
      } catch {
        return {
          source: 'unknown',
          content:
            'I tried to look up your household data but could not load it right now. Check your connection, then try again — or ask a product/how-to question instead.'
        };
      }
    }

    if (dataIntent && (!params.householdId || !params.userId)) {
      return {
        source: 'unknown',
        content: 'Sign in with an active household so I can answer using your live Finlo data.'
      };
    }

    const ragAnswer = await retrieveRagAnswer(query);
    if (ragAnswer) {
      const top = {
        id: ragAnswer.articleId,
        title: ragAnswer.sources[0]?.title ?? 'Retrieved context',
        content: ragAnswer.answer
      };
      const related: string[] = [];
      return {
        source: 'knowledge',
        articleId: ragAnswer.articleId,
        relatedRoutes: ragAnswer.relatedRoutes,
        sources: ragAnswer.sources,
        confidence: ragAnswer.confidence,
        content: `**${top.title}**\n\n${top.content}${related.length ? `\n\nRelated: ${related.join(' · ')}` : ''}`
      };
    }

    const matches = findKnowledgeMatches(query);
    if (matches.length === 0) {
      return { source: 'unknown', content: UNKNOWN_ANSWER };
    }

    const top = matches[0];
    const extras =
      matches.length > 1
        ? `\n\nRelated: ${matches
            .slice(1)
            .map((m) => m.article.title)
            .join(' · ')}`
        : '';

    return {
      source: 'knowledge',
      articleId: top.article.id,
      relatedRoutes: top.article.relatedRoutes,
      content: `**${top.article.title}**\n\n${top.article.answer}${extras}`
    };
  }
};

function relatedRoutesForIntent(intent: DataIntent): string[] {
  switch (intent) {
    case 'balance':
    case 'accounts_list':
      return ['/accounts'];
    case 'spending':
    case 'income':
    case 'cashflow':
    case 'transactions_count':
      return ['/transactions', '/'];
    case 'debt':
      return ['/debt'];
    case 'upcoming':
    case 'overdue':
    case 'recurring_summary':
      return ['/recurring', '/calendar'];
    default:
      return [];
  }
}
