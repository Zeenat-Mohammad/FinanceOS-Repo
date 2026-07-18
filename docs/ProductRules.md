# FinancialOS Product Rules

FinancialOS, also called Finlo, is a personal financial operating system. This document is the product contract for Phase 0 and the guardrail for future implementation. When product behavior, UI copy, data access, or calculations conflict, this document is the source of truth until a versioned successor replaces it.

## Financial terminology

- Income: money entering a household from salary, business income, dividends, interest, gifts, refunds classified as income, or other inflows.
- Expense: money leaving a household for consumption, bills, subscriptions, fees, taxes, or other outflows.
- Transfer: movement of money between two accounts owned by the same household. Transfers do not affect income, expenses, savings rate, or cash flow.
- Refund: money returned against a prior expense. Refunds reduce expense totals for the original category and period when linked to the original transaction; unlinked refunds are tracked separately until reconciled.
- Debt Payment: a payment toward a liability. The principal portion reduces debt balance; the interest or fee portion is an expense.
- Investment Purchase: movement of cash into an investment asset. It is a transfer of value, not an expense.
- Investment Sale: movement of value from an investment asset into cash. Realized gain or loss is tracked separately from cash movement.
- Opening Balance: the starting balance for an account at the moment it begins in FinancialOS. It seeds account history without being treated as income or expense.
- Recurring Transaction: a real transaction pattern expected to repeat on a schedule after it has been created, imported, or confirmed.
- Expected Transaction: a projected future inflow or outflow used for planning. It must not affect actual balances until confirmed as a transaction.

## Sources of truth

- Account balances: account opening balance plus immutable ledger entries, adjusted by confirmed transactions only.
- Available cash: current positive cash and depository account balances, excluding investment, loan, and credit liability accounts unless explicitly configured.
- Income: confirmed income ledger entries, excluding transfers and investment sales.
- Expenses: confirmed expense ledger entries, excluding transfers, opening balances, investment purchases, and principal debt payments.
- Debt balances: liability account balances plus principal movement entries.
- Investment balances: latest confirmed holdings, lots, market value snapshots, and investment cash movements.
- Net worth: assets minus liabilities using the latest confirmed account, debt, and investment values.
- Budgets: budget plan records plus actual confirmed expense transactions. Budgets never own transaction truth.
- Reports: derived from the ledger and approved snapshots.
- AI responses: advisory only. AI never becomes the authoritative source for balances, categories, calculations, or financial truth.

## Ledger rules

- The ledger is the canonical event stream for financial activity.
- Financial events must be append-oriented. Corrections are represented by reversal or adjustment records, not silent mutation.
- Every ledger entry must belong to a user and household.
- Every actual entry must have an effective date, created timestamp, currency, and amount.
- Money amounts must be stored as integer minor units only in future financial tables. Do not use floating point values for money.
- Transfers must be represented as paired entries or a single transfer object with explicit source and destination legs.
- Opening balances seed account history and are excluded from income, expense, cash flow, and savings-rate calculations.
- Expected transactions are projections and must remain separate from actual transactions.

## Money and currency rules

- Store money as integer minor units, such as cents for USD.
- Display money with centralized formatters only.
- Never use floating point values for persisted money, calculated money, or comparisons.
- Currency must be stored with every account and ledger entry.
- The default currency comes from the household profile.
- Cross-currency totals require an explicit exchange-rate snapshot and must identify the conversion date.
- Rounding must happen at boundaries: import, display, and external export. Internal calculations should use integer minor units.

## Calculation rules

- Account balance = opening balance + confirmed income entries - confirmed expense entries + incoming transfers - outgoing transfers + adjustments.
- Net worth = total asset value - total liability value.
- Savings rate = (income - expenses - excluded transfers - excluded debt principal) / income.
- Budget accuracy = 1 - absolute(actual expense - planned budget) / planned budget. Empty or zero budgets require an explicit no-budget state.
- Cash flow = confirmed income - confirmed expenses for a period, excluding transfers, opening balances, investment purchases, investment sales, and debt principal.
- Financial health formulas are placeholders in Phase 0. Future scoring should be modular, explainable, versioned, and based on liquidity, savings rate, debt load, cash-flow stability, goal progress, and risk exposure.

## Transfer and refund behavior

- Transfers must not appear as income or expense.
- Transfers may affect account balances, liquidity, and cash allocation.
- Transfer reconciliation must preserve both account legs.
- Refunds linked to an original expense reduce category spend for the linked period unless the user chooses current-period treatment.
- Refunds must never inflate income unless intentionally categorized as income.

## Historical immutability and versioning

- Confirmed historical financial records should not be overwritten silently.
- Edits to posted records must preserve an audit trail.
- Calculation engines must be versioned when formulas change.
- Reports and replays must identify which calculation version produced them.
- Imported records should preserve provider identifiers and import timestamps.
- User-visible corrections should be reversible where practical.

## Time, timezone, and fiscal year rules

- Store timestamps in UTC.
- Store transaction effective dates as dates in the household timezone.
- Period boundaries are calculated in the household timezone.
- Fiscal year defaults to the calendar year unless the household config sets another start month.
- Recurring schedules must store timezone and recurrence rule.
- Reports must show the timezone and period basis used for calculation.

## Permissions and household ownership

- A household owns financial data.
- Users can belong to one or more households.
- MVP permissions are owner-only for household financial data.
- Future roles may include owner, partner, viewer, advisor, and child.
- Row-level security must enforce household and user ownership.
- Shared household access must be explicit and auditable.

## MVP scope

- Email/password authentication.
- User profile and household foundation.
- Existing accounts, categories, transactions, and starter screens.
- Application architecture, providers, repository layer, error handling, feature flags, logging, formatters, and reusable UI foundation.
- Placeholder modules for future budgets, goals, debt, reports, AI, replay, and scenario simulation.

## Post-MVP scope

- Budget planning and budget accuracy.
- Goals and sinking funds.
- Debt payoff planning.
- Investment tracking.
- Net worth history.
- Cash-flow forecasting.
- Reports and exports.
- Replay and scenario simulation.
- AI copilot backed by deterministic tools and user-approved context.

## Future roadmap

- Bank sync.
- Tax planning.
- Family workspace.
- Estate planning.
- Document vault.
- Voice workflows.
- Predictive planning.
- Automation rules.
- Advisor collaboration.
