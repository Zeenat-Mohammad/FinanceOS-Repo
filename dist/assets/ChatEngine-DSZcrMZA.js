import{c as I,F as E,H as S,w as v,D as q,A as D,z as F}from"./index-DL1ObbWE.js";import{U as $,a as M}from"./finloKnowledge-Dlb6rhh_.js";import{f as T}from"./currency-BR_NEj60.js";import{D as j,f as w}from"./DebtsRepository-BvXiVeMw.js";import{R as k,P as z}from"./RecurringRepository-CtfjkyN-.js";import{g as N}from"./monthlyFinance-CZCpEc9B.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ie=I("Bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const se=I("ExternalLink",[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]]),R={async getSnapshot(t,e,a){var b;const n=N(new Date),[i,s,c,r]=await Promise.all([E.list().catch(()=>[]),S.listByPeriod(n.start,n.end).catch(()=>[]),j.getState(t,e).catch(()=>null),k.listRules().catch(()=>[])]),l=await k.ensureHorizon(t,r,2).catch(()=>[]),d=z.computeRecurringStats(r,l),u=v(new Date,"yyyy-MM-dd"),m=v(new Date(Date.now()+14*864e5),"yyyy-MM-dd"),g=l.filter(o=>(o.status==="pending"||o.status==="overdue")&&o.scheduled_date>=u&&o.scheduled_date<=m).slice(0,8).map(o=>({name:o.name,date:o.scheduled_date,amount:o.amount,status:o.status})),C=l.filter(o=>o.status==="overdue").slice(0,8).map(o=>({name:o.name,date:o.scheduled_date,amount:o.amount})),y=((b=c==null?void 0:c.debts)==null?void 0:b.filter(o=>!o.deleted_at&&o.status==="active"))??[],A=y.reduce((o,h)=>o+w(h.balance_minor),0),P=y.reduce((o,h)=>o+w(h.monthly_payment_minor||h.minimum_payment_minor),0);return{currency:a,accountCount:i.length,totalBalance:i.reduce((o,h)=>o+(h.balance??0),0),accounts:i.slice(0,8).map(o=>({name:o.name,balance:o.balance??0})),monthLabel:n.label,income:F(s),expenses:D(s),netCash:q(s),transactionCount:s.length,debtCount:y.length,totalDebt:A,monthlyDebtPayment:P,activeRecurring:d.totalCount,upcomingPayments:g,overduePayments:C,monthlyRecurringExpense:d.monthlyExpense,monthlyRecurringIncome:d.monthlyIncome}},formatMoney(t,e){return T(t,e)}},_=`# Finlo Financial Knowledge Base

> Educational guidance only. This material is not individualized investment, tax, legal, insurance, or credit advice. Rates, laws, products, and risks vary by country and over time.

## Budgeting

A budget is a plan for directing income toward needs, wants, saving, investing, and debt repayment. A useful budget is realistic, reviewed regularly, and reconciled against actual ledger transactions.

Example: Monthly take-home income is $4,000. Planned needs are $2,200, wants $700, goals $600, and debt repayment $500. The plan balances because allocations equal income.

### Zero-Based Budget

Zero-based budgeting assigns every unit of expected income a job so \`income - planned allocations = 0\`. “Zero” does not mean spending everything: savings, investing, and extra debt payments are allocations.

Example: $3,000 income can be assigned as $1,800 needs, $500 wants, $400 savings, and $300 extra debt payment.

### 50/30/20 Budget

The 50/30/20 guideline suggests up to 50% for needs, 30% for wants, and at least 20% for saving and debt reduction. Treat it as a starting point, not a rule. High housing costs or aggressive goals may require a different split.

### Envelope Budgeting

Envelope budgeting gives each spending category a fixed allowance. Physical cash is optional; digital category balances work the same way. When an envelope reaches zero, pause that category or deliberately move money from another category.

## Cash Flow

Cash flow measures money entering and leaving during a period:

\`Net cash flow = cash inflows - cash outflows\`

Positive cash flow creates capacity for savings and goals. Negative cash flow means reserves or borrowing are funding the gap. Transfers between owned accounts are normally excluded because they do not change household wealth.

Example: Income $5,000 minus expenses $4,200 gives positive cash flow of $800.

## Emergency Funds

An emergency fund is liquid money reserved for unexpected essential costs or income loss. A common target is three to six months of essential expenses; variable income, dependents, health risks, or job uncertainty may justify more.

Build it in stages: first a small buffer, then one month of essentials, then the full target. Keep it accessible and low risk rather than chasing high returns.

Example: Essential expenses of $2,500 per month imply a three-month target of $7,500 and a six-month target of $15,000.

## Debt

Debt is money owed. Evaluate each balance by outstanding principal, APR, minimum payment, remaining term, fees, collateral, tax treatment, and consequences of missed payments. Always cover contractual minimums before directing extra money to a payoff strategy.

### Snowball Strategy

Pay minimums on every debt and direct extra money to the smallest balance. After it is cleared, roll that payment into the next-smallest balance. This often creates quick motivational wins but may cost more interest than avalanche.

### Avalanche Strategy

Pay minimums on every debt and direct extra money to the highest effective APR. Repeat after each payoff. This normally minimizes interest when rates and fees are known and no special constraints apply.

### Hybrid Strategy

A hybrid strategy combines behavioral wins and interest efficiency. One approach clears a very small balance first, then switches to highest APR. Document the rule so priorities do not drift.

### Minimum Payment Strategy

Paying only minimums keeps accounts contractually current but can extend payoff for years and significantly increase interest. Use it temporarily when cash flow is constrained, then reassess the budget and repayment capacity.

### Debt Consolidation

Consolidation replaces multiple debts with one facility. It can simplify payments or reduce APR, but only if total fees, term, rate type, collateral risk, and behavior are favorable. A lower monthly payment caused by a much longer term may increase total cost.

Decision check: compare total repayment and payoff date before and after consolidation, not only the advertised monthly payment.

## APR

Annual Percentage Rate expresses annualized borrowing cost and may include certain fees. Credit-card APR is commonly converted to a periodic rate for interest calculations.

Approximation: \`monthly rate = APR / 12\`. A 24% APR is about 2% per month, although issuers often use daily periodic calculations.

## Interest

Interest is the price of borrowing or the return for lending capital. The outcome depends on principal, rate, time, compounding frequency, fees, and cash-flow timing.

### Simple Interest

\`Interest = principal × annual rate × years\`

Example: $10,000 at 6% simple interest for 3 years earns or costs \`$10,000 × 0.06 × 3 = $1,800\`.

### Compound Interest

\`Future value = principal × (1 + annual rate / compounds per year)^(compounds per year × years)\`

Example: $10,000 at 6% compounded monthly for 3 years is approximately $11,966 before tax or fees.

## Loans

A loan should be compared using APR, payment, fixed versus variable rate, term, fees, prepayment rules, collateral, default consequences, and total repayment. Longer terms usually lower the payment but raise total interest.

Amortizing payment formula:

\`Payment = P × r × (1+r)^n / ((1+r)^n - 1)\`

where \`P\` is principal, \`r\` is periodic rate, and \`n\` is number of payments.

## Credit Cards

Credit cards are revolving debt. Paying the statement balance in full by the due date usually avoids purchase interest when a grace period applies. Minimum payments prevent immediate delinquency but do not make expensive balances efficient.

Priorities: never miss the due date, understand statement versus current balance, avoid cash advances unless unavoidable, monitor utilization, and investigate unfamiliar transactions promptly.

## Mortgage

A mortgage is a property-secured loan. Compare rate type, APR, term, down payment, closing costs, insurance, taxes, maintenance, prepayment rules, and affordability under stressed rates or income.

Total housing cost is broader than principal and interest. Include property tax, insurance, association fees, repairs, utilities, and transaction costs.

## Insurance

Insurance transfers defined financial risks in exchange for premiums. Common protection includes health, life, disability, property, motor, liability, and long-term care.

Choose coverage by loss severity and household dependency, not by expected investment return. Review exclusions, deductibles, limits, waiting periods, beneficiaries, insurer strength, and inflation protection.

## Tax

Tax planning means understanding taxable income, deductions, credits, account treatment, capital gains, withholding, filing dates, and recordkeeping under applicable law. Tax rules are jurisdiction-specific and change frequently.

Keep source documents and cost basis records. Use current official guidance or a qualified professional for decisions; do not rely on generic examples for filing.

## Investments

Investing accepts uncertainty in pursuit of future growth or income. Match assets to goal horizon, liquidity needs, risk capacity, risk tolerance, costs, tax treatment, and diversification. Returns are never guaranteed.

### Stocks

A stock represents ownership in a company. Returns can come from price changes and dividends. Company, sector, valuation, governance, and market risks can produce substantial losses.

### ETF

An exchange-traded fund holds a basket of assets and trades on an exchange. Review index methodology, holdings, expense ratio, spread, tracking difference, liquidity, concentration, domicile, and tax treatment.

### Mutual Funds

A mutual fund pools investor money into a managed portfolio. It is normally priced once per trading day. Compare mandate, holdings, benchmark, fees, turnover, manager process, performance consistency, and exit charges.

### Bonds

A bond is a debt security. Major risks include interest-rate risk, inflation risk, credit/default risk, reinvestment risk, and liquidity risk. Bond prices generally move inversely to market yields.

### Gold

Gold may diversify portfolios and can respond differently to currency, inflation expectations, and market stress. It does not produce operating cash flow and can be volatile. Storage, spread, fund fees, and tax treatment matter.

### Crypto

Crypto assets can have extreme volatility, custody risk, protocol risk, regulatory uncertainty, fraud risk, and permanent-loss risk. Use only money the household can afford to lose, understand custody, and avoid leverage unless the risks are fully understood.

## Retirement

Retirement planning estimates future spending, public and employer benefits, healthcare, taxes, longevity, inflation, portfolio returns, and withdrawal risk. Start with desired spending in today’s money, inflate it to retirement, and test multiple return and lifespan scenarios.

A rough withdrawal rule is not a guarantee. Sequence-of-returns risk means poor early retirement returns can have disproportionate effects.

## Inflation

Inflation is a broad rise in prices that reduces purchasing power.

\`Future cost = current cost × (1 + inflation rate)^years\`

Example: A $50,000 goal in 10 years at 3% inflation costs about $67,196.

Real return approximation:

\`real return ≈ nominal return - inflation\`

Exact formula:

\`real return = (1 + nominal return) / (1 + inflation) - 1\`

## Deflation

Deflation is a broad decline in prices. It can increase the real burden of fixed debt and may coincide with weak demand, falling wages, or delayed spending. Not every individual price decline is economy-wide deflation.

## CPI

The Consumer Price Index measures price changes for a representative basket of consumer goods and services. Personal inflation can differ because each household’s spending mix differs from the basket.

\`Inflation rate = (current CPI - previous CPI) / previous CPI × 100\`

## SIP

A Systematic Investment Plan invests a fixed amount at regular intervals, commonly into a mutual fund. It supports discipline and averages purchase prices but does not prevent losses or guarantee gains.

## Lumpsum

A lump-sum investment deploys available capital at once. It obtains immediate market exposure but has greater sensitivity to the entry date. The choice between lump sum and phased investing should reflect horizon, risk capacity, liquidity, and behavior.

## Dollar Cost Averaging

Dollar cost averaging invests equal currency amounts periodically. More units are purchased when prices are low and fewer when high. It reduces timing regret but can underperform immediate investment in consistently rising markets.

## Risk

Risk includes loss probability, loss magnitude, volatility, illiquidity, default, inflation, concentration, currency, sequence, behavioral, and operational risks.

Risk tolerance is emotional comfort; risk capacity is the financial ability to absorb loss. The lower of the two should constrain the plan.

## Diversification

Diversification spreads exposure across assets, issuers, sectors, regions, currencies, and time. It can reduce avoidable concentration risk but cannot eliminate market-wide loss.

Check look-through holdings: owning several funds does not create diversification if they hold the same companies.

## Asset Allocation

Asset allocation is the portfolio split among cash, bonds, equities, real assets, and alternatives. It should reflect goal horizon, required return, liquidity, and risk capacity. Rebalance by new contributions or periodic trades when allocations move beyond documented bands.

Example: A long-horizon investor might use 70% diversified equities, 25% high-quality bonds, and 5% cash; this is an example, not a universal recommendation.

## Net Worth

\`Net worth = total assets - total liabilities\`

Assets include cash, investments, and property at reasonable current values. Liabilities include cards, loans, and mortgages. Net worth is a balance-sheet snapshot, not the same as monthly cash flow.

Example: $180,000 assets minus $70,000 liabilities equals $110,000 net worth.

## Financial Independence

Financial independence means assets and reliable income can support desired living costs without required employment. The target depends on spending, taxes, inflation, return assumptions, flexibility, and lifespan.

## FIRE

Financial Independence, Retire Early emphasizes a high savings rate, intentional spending, and long-term investing. Variants include Lean FIRE, Fat FIRE, Coast FIRE, and Barista FIRE. Plans should stress-test healthcare, taxes, family changes, inflation, and poor market sequences.

## Savings Rate

\`Savings rate = amount saved and invested / relevant income × 100\`

Be consistent about gross versus net income and whether employer contributions count. Example: saving $900 from $4,500 take-home income gives a 20% net savings rate.

## Sinking Funds

A sinking fund saves gradually for a known irregular cost such as insurance, travel, repairs, or annual fees.

\`Monthly sinking-fund contribution = expected cost / months until due\`

Example: Save $100 per month for a $1,200 annual premium due in 12 months.

## Goals

A SMART financial goal is Specific, Measurable, Achievable, Relevant, and Time-bound.

Example: “Build a $12,000 emergency fund by 31 December next year by contributing $750 monthly” is more actionable than “save more.”

Required monthly saving:

\`(inflation-adjusted target - current saved) / months remaining\`

Review goals after major income, family, rate, or market changes. Do not count transfers twice: a goal contribution may track purpose while the linked account remains the asset source of truth.

## Forecasting

A forecast projects future values from historical data and assumptions. It is a scenario, not a promise. Good forecasts show assumptions, confidence, nominal and inflation-adjusted values, and sensitivity to changes.

Use at least conservative, expected, and optimistic scenarios. Reforecast when actual cash flow materially differs from assumptions.

## Financial Health Score

A health score summarizes signals such as positive cash flow, emergency coverage, debt burden, savings rate, budget adherence, liquidity, diversification, and goal progress. It is a diagnostic indicator, not a credit score or guarantee.

## Budget KPIs

- Budget utilization: \`actual spending / budget × 100\`.
- Remaining budget: \`budget - actual spending\`.
- Average spending: mean spending over comparable periods.
- Predicted period-end spending: current run rate projected to period end.
- Budget accuracy: closeness of actual or predicted spending to plan.
- Budget efficiency: percentage of budget preserved without missing essential obligations.
- Spending variance: \`actual - budget\`; positive means overspending.

## Investment KPIs

- Total return: \`(ending value - contributions - beginning value) / beginning value\`.
- CAGR: \`(ending value / beginning value)^(1 / years) - 1\`, when cash flows do not distort the comparison.
- Time-weighted return removes the effect of external deposits and withdrawals.
- Money-weighted return (IRR) reflects cash-flow timing.
- Cash allocation: cash value divided by portfolio value.
- Diversification score: a diagnostic based on concentration across assets, sectors, regions, and issuers.
- Maximum drawdown: largest peak-to-trough decline.
- Volatility: dispersion of periodic returns; it is not the only form of risk.

## Forecast KPIs

- Forecast error: \`actual - forecast\`.
- Absolute percentage error: \`abs(actual - forecast) / abs(actual) × 100\`, undefined when actual is zero.
- Confidence interval: a range associated with model uncertainty, not a guarantee.
- Scenario spread: difference between optimistic and conservative results.
- Inflation-adjusted value: nominal value divided by the cumulative inflation factor.

## Common Financial Terms

- Asset: a resource with economic value.
- Liability: an obligation owed.
- Principal: original amount borrowed or invested.
- Liquidity: ability to convert an asset to cash quickly with limited loss.
- Equity: ownership value after liabilities.
- Capital gain: increase in asset value; realized when sold under many tax systems.
- Dividend: distribution from a company or fund.
- Yield: income relative to price or value.
- Expense ratio: annual fund operating cost as a percentage of assets.
- Volatility: variability of returns.
- Drawdown: decline from a prior peak.
- Rebalancing: restoring a portfolio toward target allocation.
- Benchmark: standard used for comparison.
- Credit utilization: revolving balance divided by credit limit.
- Delinquency: payment past its contractual due date.
- Solvency: ability to meet long-term obligations.
- Nominal value: value before adjusting for inflation.
- Real value: purchasing-power-adjusted value.

## Decision Trees

### Where should the next available dollar go?

1. Are essential bills and contractual minimum payments covered? If no, stabilize cash flow first.
2. Is there a starter emergency buffer? If no, build one.
3. Is an employer retirement match available? If yes, consider capturing the full match subject to plan rules.
4. Is there high-cost debt? If yes, compare accelerated payoff with required liquidity.
5. Is the full emergency target funded? If no, continue building it.
6. Fund near-term goals with low-risk liquid assets and long-term goals with a diversified allocation appropriate to risk.

### Snowball or avalanche?

1. Can all minimums be paid? If no, contact creditors and seek qualified debt help.
2. Is motivation the main obstacle? Snowball may improve adherence.
3. Is minimizing interest the main objective? Avalanche normally fits.
4. Is one tiny balance distracting while another APR is extreme? Consider a documented hybrid.

### Save, invest, or repay debt?

1. Money needed within a few years should generally prioritize safety and liquidity.
2. Compare guaranteed after-tax interest saved by repayment with uncertain after-tax investment return.
3. Preserve an emergency buffer and account for penalties, matching benefits, and risk.
4. Diversify rather than relying on a single forecast.

### Can I afford a purchase?

1. Is the purchase essential or discretionary?
2. Does cash flow remain positive after all ongoing costs?
3. Will emergency savings remain intact?
4. Are high-cost debts and near-term goals still funded?
5. Compare total ownership cost, not only monthly payment.

## Financial Formula Library

- Net cash flow: \`income - expenses\`.
- Net worth: \`assets - liabilities\`.
- Savings rate: \`savings / income × 100\`.
- Budget utilization: \`actual / budget × 100\`.
- Remaining budget: \`budget - actual\`.
- Simple interest: \`P × r × t\`.
- Compound future value: \`P × (1 + r/n)^(n×t)\`.
- Future value with regular end-period contributions: \`PMT × ((1+r)^n - 1) / r\`.
- Present value: \`FV / (1+r)^n\`.
- Inflation future cost: \`current cost × (1+i)^n\`.
- Purchasing power: \`nominal amount / (1+i)^n\`.
- Real return: \`(1+nominal return)/(1+inflation)-1\`.
- Debt-to-income ratio: \`monthly debt obligations / gross monthly income × 100\`.
- Credit utilization: \`revolving balances / revolving limits × 100\`.
- Goal completion: \`current saved / adjusted target × 100\`.
- Goal monthly requirement: \`remaining amount / months remaining\`.
- CAGR: \`(ending/beginning)^(1/years)-1\`.
- Holding return: \`(current value - cost basis + income) / cost basis × 100\`.
- Allocation percentage: \`asset-class value / total portfolio value × 100\`.

## FAQs

### How much emergency savings do I need?

Start with a small buffer, then target three to six months of essential expenses. Increase the target for unstable income, dependents, health concerns, or limited insurance.

### Should I invest while carrying debt?

There is no universal answer. Cover minimums and emergency liquidity, capture valuable employer matches where applicable, then compare the debt’s guaranteed effective cost with uncertain investment returns and your risk capacity.

### Is a high investment return forecast reliable?

No forecast guarantees return. Use conservative assumptions, account for fees, tax and inflation, and test poor early-market outcomes.

### Why is my personal inflation different from CPI?

Your spending weights differ from the representative CPI basket. Housing, food, healthcare, education, and transport inflation can affect households differently.

### Does a budget contribution move money?

No. A budget is a plan and a goal contribution is purpose tracking. Ledger transactions and account balances remain the source of truth for actual money movement.

### How often should I review finances?

Review transactions and urgent alerts weekly, budgets monthly, goals quarterly or after major changes, insurance annually, and investments on a documented schedule rather than in reaction to daily headlines.

### What return should I expect?

Expected return depends on asset mix, valuation, horizon, costs, taxes, and uncertainty. Use a range of scenarios and never treat historical averages as guaranteed future results.

`,B=new Set(["the","and","for","that","this","with","from","what","how","does","are","you","your","have","about","should","financial","money","explain"]);function L(t){return t.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}function f(t){return t.toLowerCase().replace(/[^a-z0-9%/+\s-]/g," ").replace(/\s+/g," ").trim()}function H(t){const e=t.split(/\r?\n/),a=[];let n=null;for(const i of e){const s=/^(#{2,3})\s+(.+)$/.exec(i);if(s){if(n){const c=n.lines.join(`
`).trim();c&&a.push(x(n.title,c))}n={title:s[2].trim(),lines:[]}}else n&&n.lines.push(i)}if(n){const i=n.lines.join(`
`).trim();i&&a.push(x(n.title,i))}return a}function x(t,e){const a=f(t).split(" ").filter(i=>i.length>1),n=[f(t),...a];return t.includes("/")&&n.push(...t.split("/").map(f)),{id:`financial-${L(t)}`,title:t,content:e,keywords:[...new Set(n)]}}const K=H(_);function O(t,e=3){const a=f(t),n=a.split(" ").filter(i=>i.length>2&&!B.has(i));return K.map(i=>{const s=f(i.title),c=f(i.content);let r=0;a===s&&(r+=20),(a.includes(s)||s.includes(a))&&(r+=10);for(const l of i.keywords)a.includes(l)&&(r+=l.includes(" ")?8:3);for(const l of n)s.includes(l)?r+=4:c.includes(l)&&(r+=.35);return{section:i,score:r}}).filter(i=>i.score>=5).sort((i,s)=>s.score-i.score).slice(0,e)}const W=[{intent:"balance",patterns:[/\b(my|our)?\s*(total\s+)?(balance|balances|net\s+cash\s+on\s+hand)\b/i,/\bhow\s+much\s+(do\s+i|money)\s+have\b/i,/\baccount\s+balance\b/i]},{intent:"accounts_list",patterns:[/\b(list|show)\s+(my\s+)?accounts\b/i,/\bwhat\s+accounts\b/i]},{intent:"spending",patterns:[/\b(how\s+much\s+(did\s+i|have\s+i)\s+spend|spending|expenses?|spent)\b/i,/\b(this|current)\s+month.*(spend|expense)/i]},{intent:"income",patterns:[/\b(my\s+)?income\b/i,/\bhow\s+much\s+(did\s+i|have\s+i)\s+(earn|make)\b/i]},{intent:"cashflow",patterns:[/\b(cash\s*flow|net\s+cash|surplus|deficit)\b/i]},{intent:"debt",patterns:[/\b(my\s+)?(total\s+)?debt\b/i,/\bhow\s+much\s+(do\s+i\s+)?owe\b/i,/\bloans?\b/i]},{intent:"upcoming",patterns:[/\b(upcoming|due\s+soon|next\s+(bill|payment|payments)|what('?s| is)\s+due)\b/i,/\bpayments?\s+(this|next)\s+week\b/i]},{intent:"overdue",patterns:[/\boverdue\b/i,/\blate\s+(bills?|payments?)\b/i]},{intent:"recurring_summary",patterns:[/\b(my\s+)?(recurring|subscriptions?|monthly\s+commitments?)\b/i]},{intent:"transactions_count",patterns:[/\bhow\s+many\s+transactions\b/i,/\btransaction\s+count\b/i]}];function p(t){return t.toLowerCase().replace(/[^\w\s+/.-]/g," ").replace(/\s+/g," ").trim()}function G(t,e){const a=p(t),n=new Set(["the","and","for","how","what","when","where","who","why","does","did","can","you","your","with","from","this","that","have","has","are","is","my","our","about"]),i=a.split(" ").filter(u=>u.length>2&&!n.has(u));let s=0,c=0,r=0;const l=p(e.title);l===a&&(s+=14),i.length&&i.every(u=>l.includes(u))&&(s+=4);for(const u of e.keywords){const m=p(u);if(m&&a.includes(m)){const g=m.split(" ").filter(Boolean).length;g>=3?(s+=8,c+=1):g===2?(s+=4,c+=1):m.length>4&&(s+=2.5,c+=1)}}const d=`${l} ${e.keywords.map(p).join(" ")}`;for(const u of i)d.includes(u)&&(s+=1.1,r+=1);return/\bhow\s+(do\s+i|to|can\s+i)\b/i.test(t)&&e.topic==="workflow"&&(s+=3),c===0&&r===0||r===0&&c<=1&&s<6?0:s}function U(t,e=3){return M.map(n=>({article:n,score:G(t,n)})).filter(n=>n.score>=5).sort((n,i)=>i.score-n.score).slice(0,e)}function Y(t){const e=/\b(my|our|i|me|mine)\b/i.test(t)||/\b(this|current)\s+month\b/i.test(t);let a=null;for(const n of W)for(const i of n.patterns)if(i.test(t)){const s=e?10:6;(!a||s>a.score)&&(a={intent:n.intent,score:s})}return!a||a.score<8&&!e&&!/\b(owe|spent|earn|balance|upcoming|overdue)\b/i.test(t)?null:a}function V(t,e){const a=n=>R.formatMoney(n,e.currency);switch(t){case"balance":return e.accountCount===0?"I could not find any accounts yet. Add an account under Accounts, then ask again.":[`Your combined account balance is **${a(e.totalBalance)}** across ${e.accountCount} account${e.accountCount===1?"":"s"}.`,e.accounts.length?e.accounts.map(n=>`• ${n.name}: ${a(n.balance)}`).join(`
`):""].filter(Boolean).join(`
`);case"accounts_list":return e.accounts.length===0?"No accounts found in your household yet.":`Here are your accounts:
${e.accounts.map(n=>`• ${n.name}: ${a(n.balance)}`).join(`
`)}`;case"spending":return`In **${e.monthLabel}**, you spent **${a(e.expenses)}** across ${e.transactionCount} transaction${e.transactionCount===1?"":"s"}.`;case"income":return`In **${e.monthLabel}**, your income was **${a(e.income)}**.`;case"cashflow":return[`Cash flow for **${e.monthLabel}**:`,`• Income: ${a(e.income)}`,`• Expenses: ${a(e.expenses)}`,`• Net cash: **${a(e.netCash)}**`].join(`
`);case"debt":return e.debtCount===0?"I do not see any active debts in Debt Center. If you have loans or cards, add them under Debt.":[`You have **${e.debtCount}** active debt${e.debtCount===1?"":"s"} totaling **${a(e.totalDebt)}**.`,`Scheduled monthly debt payments are about **${a(e.monthlyDebtPayment)}**.`,"Open Debt Center for snowball/avalanche simulations."].join(`
`);case"upcoming":return e.upcomingPayments.length===0?"No upcoming recurring payments in the next 14 days. Add rules under Recurring if you expect bills soon.":["Upcoming recurring payments (next 14 days):",...e.upcomingPayments.map(n=>`• ${n.name} — ${a(n.amount)} on ${n.date} (${n.status})`)].join(`
`);case"overdue":return e.overduePayments.length===0?"Good news — nothing looks overdue right now.":["Overdue payments:",...e.overduePayments.map(n=>`• ${n.name} — ${a(n.amount)} (was due ${n.date})`)].join(`
`);case"recurring_summary":return e.activeRecurring===0?"You do not have active recurring rules yet. Create one under Recurring to track bills and subscriptions.":[`You have **${e.activeRecurring}** active recurring item${e.activeRecurring===1?"":"s"}.`,`Estimated monthly recurring income: **${a(e.monthlyRecurringIncome)}**`,`Estimated monthly recurring expenses: **${a(e.monthlyRecurringExpense)}**`].join(`
`);case"transactions_count":return`You have **${e.transactionCount}** transaction${e.transactionCount===1?"":"s"} recorded in **${e.monthLabel}**.`;default:return $}}const oe={greeting(){return{source:"greeting",content:"Hi — I'm the Finlo Chatbot. Ask me about product workflows (Recurring, Calendar, Debt, Forecast), financial terms, or your live data (balances, spending, upcoming bills). If I don't know, I'll say so."}},async answer(t){const e=t.query.trim();if(!e)return{source:"unknown",content:"Please type a question about Finlo or your finances."};const a=Y(e);if(a&&t.householdId&&t.userId)try{const r=await R.getSnapshot(t.householdId,t.userId,t.currency);return{source:"data",content:V(a.intent,r),relatedRoutes:Z(a.intent)}}catch{return{source:"unknown",content:"I tried to look up your household data but could not load it right now. Check your connection, then try again — or ask a product/how-to question instead."}}if(a&&(!t.householdId||!t.userId))return{source:"unknown",content:"Sign in with an active household so I can answer using your live Finlo data."};const n=O(e);if(n.length>0){const r=n[0].section,l=n.slice(1).map(d=>d.section.title);return{source:"knowledge",articleId:r.id,relatedRoutes:Q(r.title),content:`**${r.title}**

${r.content}${l.length?`

Related: ${l.join(" · ")}`:""}`}}const i=U(e);if(i.length===0)return{source:"unknown",content:$};const s=i[0],c=i.length>1?`

Related: ${i.slice(1).map(r=>r.article.title).join(" · ")}`:"";return{source:"knowledge",articleId:s.article.id,relatedRoutes:s.article.relatedRoutes,content:`**${s.article.title}**

${s.article.answer}${c}`}}};function Z(t){switch(t){case"balance":case"accounts_list":return["/accounts"];case"spending":case"income":case"cashflow":case"transactions_count":return["/transactions","/"];case"debt":return["/debt"];case"upcoming":case"overdue":case"recurring_summary":return["/recurring","/calendar"];default:return[]}}function Q(t){const e=t.toLowerCase();return e.includes("budget")||e.includes("cash flow")?["/budget","/categories"]:e.includes("goal")||e.includes("sinking")||e.includes("emergency")?["/goals","/savings"]:e.includes("debt")||e.includes("apr")||e.includes("loan")||e.includes("credit")?["/debt"]:e.includes("invest")||e.includes("asset")||e.includes("diversif")||e.includes("risk")?["/net-worth"]:e.includes("forecast")||e.includes("inflation")||e.includes("cpi")?["/forecast"]:[]}export{ie as B,oe as C,se as E};
