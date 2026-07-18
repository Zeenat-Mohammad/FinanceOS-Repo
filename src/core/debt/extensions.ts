/**
 * Extension points for future Finlo modules.
 * DebtEngine stays pure — consumers pull summary snapshots here.
 */
export type DebtHealthSnapshot = {
  totalDebtMinor: number;
  monthlyDebtServiceMinor: number;
  monthsToFreedom: number;
  interestRemainingMinor: number;
  interestSavedMinor: number;
  debtFreeLabel: string | null;
  weightedApr: number;
};

export type ScenarioInput = {
  label: string;
  extraPaymentMinor: number;
  strategy?: string;
};

export type CashFlowDebtAdjustment = {
  /** Principal portion to exclude from expense cash flow. */
  principalMinor: number;
  /** Interest portion that remains an expense. */
  interestMinor: number;
};
