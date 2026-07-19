export const queryKeys = {
  profile: {
    current: ['profile', 'current'] as const,
    byUser: (userId: string) => ['profile', userId] as const
  },
  accounts: {
    all: ['accounts'] as const,
    detail: (accountId: string) => ['accounts', accountId] as const
  },
  categories: {
    all: ['categories'] as const,
    byType: (type: string) => ['categories', type] as const
  },
  transactions: {
    all: ['transactions'] as const,
    ledger: (filters: Record<string, unknown>) => ['transactions', 'ledger', filters] as const,
    byAccount: (accountId: string) => ['transactions', 'account', accountId] as const,
    byPeriod: (start: string, end: string) => ['transactions', 'period', start, end] as const
  },
  recurring: {
    rules: ['recurring', 'rules'] as const,
    bills: ['recurring', 'bills'] as const,
    expected: ['recurring', 'expected'] as const,
    instances: (householdId: string, range: string) => ['recurring', householdId, 'instances', range] as const,
    workspace: (householdId: string) => ['recurring', householdId, 'workspace'] as const
  },
  calendar: {
    month: (householdId: string, key: string) => ['calendar', householdId, 'month', key] as const,
    week: (householdId: string, key: string) => ['calendar', householdId, 'week', key] as const
  },
  onboarding: {
    current: ['onboarding', 'current'] as const,
    byUser: (userId: string) => ['onboarding', userId] as const
  },
  debts: {
    all: (householdId: string) => ['debts', householdId] as const,
    settings: (householdId: string) => ['debts', householdId, 'settings'] as const,
    simulation: (householdId: string, fingerprint: string) => ['debts', householdId, 'simulation', fingerprint] as const
  },
  forecast: {
    history: (householdId: string) => ['forecast', householdId, 'history'] as const,
    bundle: (householdId: string, fingerprint: string) => ['forecast', householdId, 'bundle', fingerprint] as const
  },
  insights: {
    bundle: (householdId: string, country: string) => ['insights', householdId, country, 'bundle'] as const,
    holdings: (householdId: string) => ['insights', householdId, 'holdings'] as const,
    receipts: (householdId: string, q: string) => ['insights', householdId, 'receipts', q] as const
  },
  netWorth: {
    bundle: (householdId: string) => ['net-worth', householdId, 'bundle'] as const
  },
  savings: {
    bundle: (householdId: string) => ['savings', householdId, 'bundle'] as const
  },
  goals: {
    bundle: (householdId: string) => ['goals', householdId, 'bundle'] as const
  },
  budget: {
    bundle: (householdId: string) => ['budget', householdId, 'bundle'] as const,
    month: (householdId: string, year: number, month: number) => ['budget', householdId, year, month] as const
  },
  wealth: {
    summary: (householdId: string) => ['wealth', householdId, 'summary'] as const
  },
  feedback: {
    mine: (userId: string) => ['feedback', userId, 'mine'] as const,
    admin: (filters: Record<string, unknown>) => ['admin', 'feedback', filters] as const
  },
  notifications: {
    all: (householdId: string, userId: string) => ['notifications', householdId, userId] as const
  },
  inflation: {
    snapshot: (countryCode: string) => ['inflation', countryCode] as const
  },
  dashboard: {
    summary: (householdId: string) => ['dashboard', householdId, 'summary'] as const
  },
  admin: {
    dashboard: ['admin', 'dashboard'] as const
  },
  reports: {
    years: ['reports', 'years'] as const,
    months: (householdId: string, year: number) => ['reports', householdId, 'months', year] as const,
    detail: (householdId: string, key: string) => ['reports', householdId, 'detail', key] as const
  },
  search: {
    global: (householdId: string, query: string) => ['search', householdId, query] as const
  }
};
