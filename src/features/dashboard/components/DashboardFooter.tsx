import { Link } from 'react-router-dom';
import { Card } from '@/shared/components';

/** Reserved slots for future flagship modules. */
export function DashboardFooter() {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Coming soon modules">
      {[
        { title: 'Savings Center', blurb: 'Habits, challenges, and automatic savings insights.', to: '/savings' },
        { title: 'Reports', blurb: 'Review cash flow, category performance, and monthly summaries.', to: '/reports' },
        { title: 'Receipt OCR', blurb: 'Scan receipts directly from the Transactions workspace.', to: '/transactions' },
        { title: 'Net Worth Widget', blurb: 'Assets vs liabilities now live directly on the dashboard.', to: '/dashboard' }
      ].map((item) => (
        <Card key={item.title} className="border-dashed border-border/70 bg-surface/40 backdrop-blur-md">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-accent">Future ready</div>
          <h3 className="mt-1 text-sm font-semibold text-foreground">{item.title}</h3>
          <p className="mt-1 text-xs text-muted">{item.blurb}</p>
          <Link to={item.to} className="mt-3 inline-flex text-xs font-medium text-accent hover:underline">
            Explore →
          </Link>
        </Card>
      ))}
    </section>
  );
}
