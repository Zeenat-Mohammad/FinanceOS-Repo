export type KnowledgeTopic =
  | 'getting-started'
  | 'dashboard'
  | 'accounts'
  | 'transactions'
  | 'categories'
  | 'recurring'
  | 'calendar'
  | 'debt'
  | 'forecast'
  | 'budget'
  | 'goals'
  | 'reports'
  | 'terms'
  | 'workflow';

export type KnowledgeArticle = {
  id: string;
  topic: KnowledgeTopic;
  title: string;
  /** Searchable aliases / keywords */
  keywords: string[];
  summary: string;
  answer: string;
  relatedRoutes?: string[];
};

/**
 * Curated Finlo “training” corpus — product terms, techniques, and workflows.
 * The chatbot retrieves from this set when answering how-to / concept questions.
 */
export const FINLO_KNOWLEDGE: KnowledgeArticle[] = [
  {
    id: 'what-is-finlo',
    topic: 'getting-started',
    title: 'What is Finlo?',
    keywords: ['finlo', 'what is finlo', 'about finlo', 'personal finance', 'operating system', 'finance app'],
    summary: 'Finlo is a personal financial operating system.',
    answer:
      'Finlo is a personal financial operating system for households. It connects accounts, transactions, categories, recurring payments, calendar planning, debt payoff, and forecasts so you can see cash flow, commitments, and progress in one place — not a spreadsheet.',
    relatedRoutes: ['/']
  },
  {
    id: 'onboarding',
    topic: 'getting-started',
    title: 'Onboarding',
    keywords: ['onboarding', 'setup', 'get started', 'first time', 'wizard'],
    summary: 'Complete onboarding to unlock the workspace.',
    answer:
      'Onboarding walks you through creating your household profile and basics. Until it is complete, most modules stay locked in the sidebar. Finish onboarding under Onboarding, then Dashboard, Accounts, Transactions, and the rest unlock.',
    relatedRoutes: ['/onboarding']
  },
  {
    id: 'dashboard',
    topic: 'dashboard',
    title: 'Dashboard',
    keywords: ['dashboard', 'home', 'overview', 'hero', 'health score', 'cash flow chart'],
    summary: 'Your live financial overview.',
    answer:
      'The Dashboard summarizes balance, income, expenses, net cash, health score, cash-flow charts, budget/goals/debt snapshots, this week’s recurring payments, a mini calendar, upcoming items, and recent transactions. Use Quick Actions to jump into common tasks.',
    relatedRoutes: ['/']
  },
  {
    id: 'accounts',
    topic: 'accounts',
    title: 'Accounts',
    keywords: ['account', 'accounts', 'wallet', 'bank', 'balance', 'checking', 'savings', 'credit card'],
    summary: 'Track cash and credit balances by account.',
    answer:
      'Accounts hold your wallets, bank accounts, and cards. Each transaction posts to an account and updates its balance. Keep at least one active account so recurring “Mark Paid” can create ledger entries.',
    relatedRoutes: ['/accounts']
  },
  {
    id: 'transactions',
    topic: 'transactions',
    title: 'Transactions',
    keywords: ['transaction', 'transactions', 'ledger', 'expense', 'income', 'transfer', 'posted'],
    summary: 'The ledger of money in and out.',
    answer:
      'Transactions are the source of truth for cash flow. Types include income, expense, and transfer. Categorize them for budgets and reports. Recurring payments create transactions when you mark an instance paid.',
    relatedRoutes: ['/transactions']
  },
  {
    id: 'categories',
    topic: 'categories',
    title: 'Categories',
    keywords: ['category', 'categories', 'tag', 'group', 'budget category', 'archive category'],
    summary: 'Organize spending and income.',
    answer:
      'Categories group transactions (e.g. Food, Rent, Salary). The Categories page uses cards with usage stats, budgets, and trends. Archive unused categories instead of deleting when you want history preserved.',
    relatedRoutes: ['/categories']
  },
  {
    id: 'recurring',
    topic: 'recurring',
    title: 'Recurring payments',
    keywords: [
      'recurring',
      'subscription',
      'bill',
      'salary',
      'repeat',
      'auto create',
      'mark paid',
      'payment instance',
      'cadence',
      'frequency'
    ],
    summary: 'Automate bills, subscriptions, and scheduled income.',
    answer:
      'Recurring rules define repeating income or expenses (daily, weekly, monthly, yearly). Finlo generates payment instances for the calendar and dashboard. Statuses: pending, overdue, paid, skipped. Mark Paid creates a linked ledger transaction and advances next due — without duplicating the same occurrence.',
    relatedRoutes: ['/recurring', '/calendar']
  },
  {
    id: 'payment-engine',
    topic: 'recurring',
    title: 'Payment engine',
    keywords: ['payment engine', 'horizon', 'next due', 'overdue', 'instance', 'virtual instance'],
    summary: 'Engine that schedules and tracks recurring instances.',
    answer:
      'The Payment Engine calculates schedules from cadence, builds upcoming instances, marks past-due items overdue, computes monthly commitments, and powers reminders. Instances can live in Supabase (`recurring_payment_instances`) or local fallback storage.',
    relatedRoutes: ['/recurring']
  },
  {
    id: 'calendar',
    topic: 'calendar',
    title: 'Financial calendar',
    keywords: ['calendar', 'month view', 'week view', 'day drawer', 'schedule'],
    summary: 'See payments by day.',
    answer:
      'Calendar shows recurring payments on a month or week grid. Colors: income (green), expense (purple), pending (teal), overdue (red). Click a day to open the drawer and mark paid, skip, or review items.',
    relatedRoutes: ['/calendar']
  },
  {
    id: 'debt-center',
    topic: 'debt',
    title: 'Debt Center',
    keywords: ['debt', 'loan', 'credit card', 'payoff', 'amortization', 'interest'],
    summary: 'Simulate debt payoff strategies.',
    answer:
      'Debt Center models balances, APR, minimums, and extra payments. Compare strategies, view amortization, and export summaries. Extra payments accelerate payoff and reduce interest.',
    relatedRoutes: ['/debt']
  },
  {
    id: 'snowball',
    topic: 'debt',
    title: 'Debt snowball',
    keywords: ['snowball', 'smallest balance', 'debt snowball'],
    summary: 'Pay smallest balances first.',
    answer:
      'Snowball orders debts by lowest balance first (ignoring APR). You pay minimums on all debts and dump extra at the smallest balance. Psychological wins come faster; interest savings may be lower than avalanche.',
    relatedRoutes: ['/debt']
  },
  {
    id: 'avalanche',
    topic: 'debt',
    title: 'Debt avalanche',
    keywords: ['avalanche', 'highest apr', 'interest first'],
    summary: 'Pay highest APR first.',
    answer:
      'Avalanche targets the highest interest rate first while paying minimums on the rest. It usually minimizes total interest paid compared with snowball.',
    relatedRoutes: ['/debt']
  },
  {
    id: 'forecast',
    topic: 'forecast',
    title: 'Forecast',
    keywords: ['forecast', 'projection', 'holt', 'winters', 'scenario', 'what if', 'horizon'],
    summary: 'Project income, expenses, and net worth.',
    answer:
      'Insights at /insights is Finlo’s financial intelligence desk: portfolio, inflation, rates, tax, news, receipt OCR, and AI recommendations. Legacy forecast engines still power Dashboard health projections.',
    relatedRoutes: ['/insights']
  },
  {
    id: 'budget',
    topic: 'budget',
    title: 'Budget',
    keywords: ['budget', 'spending limit', 'envelope', 'allocation'],
    summary: 'Plan category spending limits.',
    answer:
      'Budget is where you set monthly category limits and track actual vs planned spending. The module may still be expanding; category cards already surface budget fields where assigned.',
    relatedRoutes: ['/budget', '/categories']
  },
  {
    id: 'goals',
    topic: 'goals',
    title: 'Goals',
    keywords: ['goal', 'goals', 'savings goal', 'target', 'milestone'],
    summary: 'Track savings milestones.',
    answer:
      'Goals track financial targets (emergency fund, vacation, down payment) with current progress toward a target amount and date. Contributions reduce available cash but build toward the goal.',
    relatedRoutes: ['/goals']
  },
  {
    id: 'reports',
    topic: 'reports',
    title: 'Reports',
    keywords: ['report', 'reports', 'export', 'summary'],
    summary: 'Summaries and exports.',
    answer:
      'Reports builds automatic monthly PDF summaries from your ledger. Filter by year, preview each month, then print (A4, US Letter, or A3) or download the PDF.',
    relatedRoutes: ['/reports']
  },
  {
    id: 'cash-flow',
    topic: 'terms',
    title: 'Cash flow',
    keywords: ['cash flow', 'net cash', 'money in out'],
    summary: 'Income minus expenses over a period.',
    answer:
      'Cash flow is income minus expenses for a period (transfers are usually excluded from net cash). Positive cash flow means you kept more than you spent; negative means spending exceeded income.',
    relatedRoutes: ['/', '/transactions']
  },
  {
    id: 'net-worth',
    topic: 'terms',
    title: 'Net worth',
    keywords: ['net worth', 'assets', 'liabilities'],
    summary: 'Assets minus liabilities.',
    answer:
      'Net worth is roughly assets (cash, investments) minus liabilities (debts). Finlo’s forecast can project net worth using cash, investments, and debt payoff trajectories.',
    relatedRoutes: ['/forecast']
  },
  {
    id: 'apr',
    topic: 'terms',
    title: 'APR',
    keywords: ['apr', 'interest rate', 'annual percentage rate'],
    summary: 'Annual percentage rate on debt.',
    answer:
      'APR is the yearly interest rate on a debt. Higher APR debts cost more over time; avalanche strategy prioritizes them. Finlo Debt Center uses APR to estimate interest and payoff timelines.',
    relatedRoutes: ['/debt']
  },
  {
    id: 'amortization',
    topic: 'terms',
    title: 'Amortization',
    keywords: ['amortization', 'schedule', 'principal', 'interest split'],
    summary: 'Payment schedule splitting principal and interest.',
    answer:
      'An amortization schedule shows each payment split into interest and principal, and the remaining balance. Debt Center can display this for your selected strategy.',
    relatedRoutes: ['/debt']
  },
  {
    id: 'workflow-mark-paid',
    topic: 'workflow',
    title: 'Workflow: mark a recurring payment paid',
    keywords: ['how to mark paid', 'pay bill', 'checkbox paid', 'create transaction from recurring'],
    summary: 'Recurring → instance → ledger.',
    answer:
      '1) Create a recurring rule with an account.\n2) Finlo generates instances on Recurring, Calendar, and Dashboard.\n3) Mark Paid (card, calendar drawer, or week widget).\n4) A transaction posts to the ledger and the instance links to it.\n5) Dashboard cash flow and upcoming lists refresh.',
    relatedRoutes: ['/recurring', '/calendar', '/']
  },
  {
    id: 'workflow-add-recurring',
    topic: 'workflow',
    title: 'Workflow: add a recurring bill',
    keywords: ['how to add recurring', 'add subscription', 'new bill', 'add salary'],
    summary: 'Create a recurring rule.',
    answer:
      'Open Recurring → Add Recurring. Enter name, income/expense, category, account, amount, frequency, start/next dates, reminder days, and whether to auto-create transactions. Save — instances appear on Calendar and the weekly dashboard widget.',
    relatedRoutes: ['/recurring']
  },
  {
    id: 'workflow-categorize',
    topic: 'workflow',
    title: 'Workflow: categorize spending',
    keywords: ['how to categorize', 'assign category', 'organize spending'],
    summary: 'Categories unlock insights.',
    answer:
      'Create categories on the Categories page, then assign them when adding or editing transactions. Dashboard category breakdown and budget widgets rely on categorized expenses.',
    relatedRoutes: ['/categories', '/transactions']
  },
  {
    id: 'profile',
    topic: 'getting-started',
    title: 'Profile',
    keywords: ['profile', 'currency', 'locale', 'name', 'preferences'],
    summary: 'Your user and household preferences.',
    answer:
      'Profile holds your name and personal preferences. Household default currency drives money formatting across Dashboard, Recurring, Debt, and Forecast. Prefer Profile over a separate Settings page for personal details.',
    relatedRoutes: ['/profile']
  },
  {
    id: 'household',
    topic: 'getting-started',
    title: 'Household',
    keywords: ['household', 'workspace', 'family', 'shared'],
    summary: 'Shared finance workspace.',
    answer:
      'A household is the shared Finlo workspace. Accounts, transactions, recurring rules, and debts belong to the household so members can collaborate under the same ledger.',
    relatedRoutes: ['/onboarding', '/profile']
  },
  {
    id: 'chatbot',
    topic: 'getting-started',
    title: 'Finlo Chatbot',
    keywords: ['chatbot', 'assistant', 'help', 'ask', 'ai', 'copilot'],
    summary: 'In-app guide for Finlo.',
    answer:
      'This Chatbot answers with Finlo product knowledge (terms, techniques, workflows). If you ask about *your* numbers — balances, debts, spending, upcoming bills — it fetches live household data. If it cannot find a confident answer, it will say so clearly.',
    relatedRoutes: ['/']
  }
];

export type FinloFaq = {
  id: string;
  question: string;
  answer: string;
  relatedRoutes?: string[];
};

/** Curated FAQ list shown in the floating chatbot FAQs tab. */
export const FINLO_FAQS: FinloFaq[] = [
  {
    id: 'faq-what',
    question: 'What is Finlo?',
    answer:
      'Finlo is a personal financial operating system for households — accounts, transactions, recurring bills, calendar, debt payoff, and forecasts in one place.',
    relatedRoutes: ['/']
  },
  {
    id: 'faq-recurring',
    question: 'How do recurring payments work?',
    answer:
      'Create a recurring rule (bill, subscription, or income). Finlo generates payment instances on Recurring, Calendar, and the dashboard week widget. Mark Paid posts a ledger transaction without duplicates.',
    relatedRoutes: ['/recurring', '/calendar']
  },
  {
    id: 'faq-mark-paid',
    question: 'How do I mark a bill as paid?',
    answer:
      'Open Recurring, Calendar day drawer, or Dashboard → Current Week Payments, then Mark Paid. The rule must have an account assigned.',
    relatedRoutes: ['/recurring', '/']
  },
  {
    id: 'faq-debt',
    question: 'What is snowball vs avalanche?',
    answer:
      'Snowball pays the smallest balance first for quick wins. Avalanche pays the highest APR first to minimize interest. Compare both in Debt Center.',
    relatedRoutes: ['/debt']
  },
  {
    id: 'faq-forecast',
    question: 'How does Forecast work?',
    answer:
      'Forecast projects 6/12/24 months of cash flow and net worth from your ledger and debt plan using deterministic models. Use scenarios and what-if controls to explore changes.',
    relatedRoutes: ['/forecast']
  },
  {
    id: 'faq-data',
    question: 'Can the chatbot use my data?',
    answer:
      'Yes. Ask about balances, spending this month, income, debt totals, upcoming or overdue payments. If Finlo cannot find an answer, it will say so instead of guessing.',
    relatedRoutes: ['/']
  },
  {
    id: 'faq-categories',
    question: 'Why categorize transactions?',
    answer:
      'Categories power spending breakdowns, budgets, and insights on the Dashboard. Create groups on Categories, then assign them on transactions.',
    relatedRoutes: ['/categories', '/transactions']
  },
  {
    id: 'faq-calendar',
    question: 'What do calendar colors mean?',
    answer:
      'Income is green, expenses purple, pending teal, and overdue red. Switch Month/Week views and click a day for details.',
    relatedRoutes: ['/calendar']
  }
];

export const UNKNOWN_ANSWER =
  "I don't have a reliable answer for that yet. Try asking about Finlo features (Dashboard, Recurring, Calendar, Debt, Forecast), financial terms (cash flow, APR, snowball), workflows (how to mark a bill paid), or your own data (balances, spending this month, upcoming payments, total debt).";

export const SUGGESTED_PROMPTS = [
  'What is Finlo?',
  'How do I mark a recurring payment paid?',
  'Explain debt avalanche vs snowball',
  'What is my account balance?',
  'How much did I spend this month?',
  'What payments are upcoming?',
  'How does the forecast work?'
];
