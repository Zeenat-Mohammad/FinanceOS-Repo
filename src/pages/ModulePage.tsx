type ModulePageProps = {
  title: string;
  description: string;
};

export default function ModulePage({ title, description }: ModulePageProps) {
  return (
    <section className="max-w-2xl">
      <p className="text-sm font-medium text-sky-300">Phase 1 template</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-slate-400">{description}</p>
      <div className="mt-6 rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-5 text-sm text-slate-300">
        This route is ready for its feature module: types, Supabase queries, Zustand state and UI components.
      </div>
    </section>
  );
}
