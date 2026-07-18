export type AdminSecurityEvent = {
  id: string;
  userId: string;
  eventType: string;
  metadata: Record<string, unknown>;
  userAgent: string | null;
  createdAt: string;
};

export type AdminDashboardSummary = {
  generatedAt: string;
  users: {
    total: number;
    onboarded: number;
    pendingOnboarding: number;
    newLast7Days: number;
  };
  households: {
    total: number;
    memberships: number;
    multiMemberHouseholds: number;
  };
  ledger: {
    accounts: number;
    archivedAccounts: number;
    transactions: number;
    transactionsLast30Days: number;
    recurringRules: number;
    importBatches: number;
  };
  security: {
    events: number;
    loginFailuresLast24Hours: number;
    suspiciousEventsLast7Days: number;
    recentEvents: AdminSecurityEvent[];
    recentErrors: AdminSecurityEvent[];
  };
};
