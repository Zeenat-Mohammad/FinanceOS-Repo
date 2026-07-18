import { Link } from 'react-router-dom';
import { Card } from '@/shared/components';

/** Reserved slots for future flagship modules. */
export function DashboardFooter() {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Coming soon modules">
      {[
        { title: 'AI Copilot', blurb: 'Ask Finlo about your money in plain language.', to: '/forecast' },
        { title: 'Forecast', blurb: '24-month projections are live in Forecast Center.', to: '/forecast' },
        { title: 'Scenario Simulator', blurb: 'What-if shocks — reserved for deeper scenarios.', to: '/forecast' },
        { title: 'Financial Replay', blurb: 'Rewind month-by-month decisions — coming later.', to: '/reports' }
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
