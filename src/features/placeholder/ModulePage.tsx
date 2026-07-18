import ComingSoonPage from './ComingSoonPage';

type ModulePageProps = {
  title: string;
  description: string;
};

export default function ModulePage({ title, description }: ModulePageProps) {
  return <ComingSoonPage title={title} description={description} />;
}
