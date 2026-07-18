import { ArrowLeft, Sparkles, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Page, PageHeader } from '@/shared/components';

type ComingSoonPageProps = {
  title: string;
  description: string;
  Icon?: LucideIcon;
};

export default function ComingSoonPage({ title, description, Icon = Sparkles }: ComingSoonPageProps) {
  const navigate = useNavigate();

  return (
    <Page className="max-w-3xl">
      <PageHeader title={title} description={description} />
      <Card className="grid place-items-center py-12 text-center">
        <Icon aria-hidden className="h-12 w-12 text-success" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">{title} is coming soon</h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          This future Finlo module will unlock deeper planning once the foundation is ready.
        </p>
        <Button className="mt-6" onClick={() => navigate('/')}>
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </Card>
    </Page>
  );
}
