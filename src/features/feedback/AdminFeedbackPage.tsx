import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, MessageSquareReply, RefreshCw, UserCheck } from 'lucide-react';
import { FeedbackRepository } from '@/data/repositories/FeedbackRepository';
import { queryKeys } from '@/data/query-keys';
import { useAuthStore } from '@/features/auth/authStore';
import { Button, Card, LoadingState, Modal, Page, PageHeader, StatCard } from '@/shared/components';
import type { FeedbackCategory, FeedbackItem, FeedbackPriority, FeedbackStatus } from '@/types/intelligence';

const COLORS = ['#3a9d9d', '#b6d7a8', '#b4a7d6', '#cf7d7d', '#d8b36a'];

export default function AdminFeedbackPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<FeedbackCategory | 'all'>('all');
  const [priority, setPriority] = useState<FeedbackPriority | 'all'>('all');
  const [status, setStatus] = useState<FeedbackStatus | 'all'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const filters = useMemo(() => ({ category, priority, status, from, to }), [category, from, priority, status, to]);
  const query = useQuery({
    queryKey: queryKeys.feedback.admin(filters),
    queryFn: () => FeedbackRepository.listAll(filters),
    staleTime: 15_000,
    retry: false
  });
  const [replyItem, setReplyItem] = useState<FeedbackItem | null>(null);
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof FeedbackRepository.updateAdmin>[1] }) =>
      FeedbackRepository.updateAdmin(id, patch),
    onSuccess: invalidate
  });
  const sendReply = useMutation({
    mutationFn: () => FeedbackRepository.reply(replyItem!.id, user!.id, reply.trim(), internal),
    onSuccess: async () => {
      setReply('');
      setReplyItem(null);
      await invalidate();
    }
  });

  if (query.isLoading || !query.data) return <LoadingState label="Loading feedback management" />;
  const rows = query.data;
  const open = rows.filter((item) => !['completed', 'rejected', 'duplicate'].includes(item.status)).length;
  const completed = rows.filter((item) => item.status === 'completed').length;
  const critical = rows.filter((item) => item.priority === 'critical').length;
  const averageRating = rows.length ? rows.reduce((sum, item) => sum + item.rating, 0) / rows.length : 0;
  const analytics = buildAnalytics(rows);

  function exportCsv() {
    const data = [
      ['ID', 'Created', 'Rating', 'Category', 'Priority', 'Status', 'Title', 'Email'].join(','),
      ...rows.map((item) => [item.id, item.created_at, item.rating, item.category, item.priority, item.status, csv(item.title), csv(item.email ?? '')].join(','))
    ].join('\n');
    const url = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `finlo-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Page className="pb-8">
      <PageHeader title="Feedback Management" description="Triage, assign, reply, close, deduplicate, export and analyze user feedback." action={<div className="flex gap-2"><Button className="border border-border bg-surface text-foreground hover:bg-secondary" onClick={() => void query.refetch()}><RefreshCw className="h-4 w-4" /> Refresh</Button><Button onClick={exportCsv}><Download className="h-4 w-4" /> Export</Button></div>} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="Total feedback" value={rows.length} /><StatCard label="Open" value={open} /><StatCard label="Completed" value={completed} /><StatCard label="Critical" value={critical} /><StatCard label="Average rating" value={averageRating.toFixed(1)} hint="out of 5" /></section>
      <Card>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Filter label="Category" value={category} onChange={(value) => setCategory(value as FeedbackCategory | 'all')} options={['all', 'feature', 'bug', 'suggestion', 'complaint', 'general']} />
          <Filter label="Priority" value={priority} onChange={(value) => setPriority(value as FeedbackPriority | 'all')} options={['all', 'low', 'medium', 'high', 'critical']} />
          <Filter label="Status" value={status} onChange={(value) => setStatus(value as FeedbackStatus | 'all')} options={['all', 'submitted', 'under_review', 'accepted', 'rejected', 'completed', 'duplicate']} />
          <label className="text-xs font-medium text-muted">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} /></label>
          <label className="text-xs font-medium text-muted">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} /></label>
        </div>
      </Card>
      <section className="grid gap-4 xl:grid-cols-2">
        <Chart title="Feedback trend"><ResponsiveContainer><LineChart data={analytics.trend}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="date" /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="count" stroke="#3a9d9d" strokeWidth={2.5} /></LineChart></ResponsiveContainer></Chart>
        <Chart title="Ratings"><ResponsiveContainer><BarChart data={analytics.ratings}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="rating" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#b4a7d6" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></Chart>
        <Chart title="Bug categories"><ResponsiveContainer><PieChart><Pie data={analytics.bugs} dataKey="value" nameKey="name" outerRadius={90}>{analytics.bugs.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></Chart>
        <Chart title="Feature requests"><ResponsiveContainer><BarChart data={analytics.features} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={100} /><Tooltip /><Bar dataKey="value" fill="#b6d7a8" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></Chart>
      </section>
      <section className="space-y-3">
        {rows.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{item.category} · {item.priority} · {item.status.replaceAll('_', ' ')} · {item.rating}/5</div><h2 className="mt-1 font-semibold text-foreground">{item.title}</h2><p className="mt-2 max-w-3xl text-sm text-muted">{item.description}</p><div className="mt-2 text-[11px] text-muted">{item.email ?? 'No email'} · {new Date(item.created_at).toLocaleString()}</div></div>
              <div className="flex flex-wrap gap-2">
                <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={() => update.mutate({ id: item.id, patch: { assigned_to: user!.id, status: 'under_review' } })}><UserCheck className="h-4 w-4" /> Assign</Button>
                <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={() => { setReplyItem(item); setInternal(false); }}><MessageSquareReply className="h-4 w-4" /> Reply</Button>
                <Button onClick={() => update.mutate({ id: item.id, patch: { status: 'completed', closed_at: new Date().toISOString() } })}>Close</Button>
                <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={() => { const duplicate = window.prompt('Duplicate feedback ID'); if (duplicate) update.mutate({ id: item.id, patch: { status: 'duplicate', duplicate_of: duplicate, closed_at: new Date().toISOString() } }); }}>Mark duplicate</Button>
              </div>
            </div>
            {item.feedback_reply?.length ? <div className="mt-3 border-t border-border pt-3 text-xs text-muted">{item.feedback_reply.length} repl{item.feedback_reply.length === 1 ? 'y' : 'ies'} · {item.feedback_reply.filter((entry) => entry.is_internal).length} internal</div> : null}
          </Card>
        ))}
        {!rows.length ? <Card className="text-center text-sm text-muted">No feedback matches these filters.</Card> : null}
      </section>
      <Modal open={Boolean(replyItem)} title={`Reply to ${replyItem?.title ?? 'feedback'}`} onClose={() => setReplyItem(null)}>
        <form onSubmit={(event: FormEvent) => { event.preventDefault(); sendReply.mutate(); }}><textarea required minLength={2} rows={6} value={reply} onChange={(e) => setReply(e.target.value)} className={inputClass} /><label className="mt-3 flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note (hidden from user)</label><div className="mt-4 flex justify-end gap-2"><Button type="button" className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={() => setReplyItem(null)}>Cancel</Button><Button type="submit" disabled={sendReply.isPending}>Send reply</Button></div></form>
      </Modal>
    </Page>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="text-xs font-medium text-muted">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>{options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select></label>;
}

function Chart({ title, children }: { title: string; children: ReactNode }) {
  return <Card><h2 className="text-sm font-semibold text-foreground">{title}</h2><div className="mt-3 h-64">{children}</div></Card>;
}

function buildAnalytics(rows: FeedbackItem[]) {
  const dates = new Map<string, number>();
  const ratings = new Map<number, number>([1, 2, 3, 4, 5].map((value) => [value, 0]));
  for (const item of rows) {
    const date = item.created_at.slice(0, 10);
    dates.set(date, (dates.get(date) ?? 0) + 1);
    ratings.set(item.rating, (ratings.get(item.rating) ?? 0) + 1);
  }
  const categories = (kind: FeedbackCategory) => Object.entries(rows.filter((item) => item.category === kind).reduce<Record<string, number>>((map, item) => { const key = item.priority; map[key] = (map[key] ?? 0) + 1; return map; }, {})).map(([name, value]) => ({ name, value }));
  return { trend: [...dates].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })), ratings: [...ratings].map(([rating, count]) => ({ rating, count })), bugs: categories('bug'), features: categories('feature') };
}

function csv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

const inputClass = 'mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';

