import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Bug, Lightbulb, MessageSquareText, Send, Star, Upload } from 'lucide-react';
import { FeedbackRepository } from '@/data/repositories/FeedbackRepository';
import { queryKeys } from '@/data/query-keys';
import { useAuthStore } from '@/features/auth/authStore';
import { Button, Card, EmptyState, LoadingState, Page, PageHeader, toast } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import type { FeedbackCategory, FeedbackPriority, FeedbackStatus } from '@/types/intelligence';

export default function FeedbackPage() {
  const user = useAuthStore((state) => state.user);
  const household = useAuthStore((state) => state.household);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const feedback = useQuery({
    queryKey: queryKeys.feedback.mine(user?.id ?? 'none'),
    queryFn: () => FeedbackRepository.listMine(user!.id),
    enabled: Boolean(user)
  });
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('suggestion');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<FeedbackPriority>('medium');
  const [email, setEmail] = useState(user?.email ?? '');
  const [screenshot, setScreenshot] = useState<File | null>(null);

  useEffect(() => {
    const source = searchParams.get('source');
    const query = searchParams.get('query')?.trim();
    const categoryParam = searchParams.get('category');
    if (categoryParam === 'feature' || categoryParam === 'bug' || categoryParam === 'suggestion' || categoryParam === 'complaint' || categoryParam === 'general') {
      setCategory(categoryParam);
    }
    if (query) {
      setTitle(query.length > 120 ? `${query.slice(0, 117)}…` : query);
      setDescription(
        source === 'chatbot'
          ? `Chatbot could not answer this question:\n\n"${query}"\n\nPlease share any extra context that would help us improve Finlo.`
          : query
      );
    }
  }, [searchParams]);

  const submit = useMutation({
    mutationFn: async () => {
      let screenshotPath: string | null = null;
      if (screenshot) {
        if (!household) throw new Error('An active household is required to upload a screenshot.');
        screenshotPath = await FeedbackRepository.uploadScreenshot(household.id, user!.id, screenshot);
      }
      const chatQuery = searchParams.get('query')?.trim();
      const chatArticleId = searchParams.get('articleId')?.trim();
      return FeedbackRepository.create({
        householdId: household?.id,
        userId: user!.id,
        rating,
        title: title.trim(),
        category,
        description: description.trim(),
        screenshotPath,
        priority,
        email: email.trim() || null,
        deviceInfo: `${navigator.platform || 'Unknown platform'} · ${window.screen.width}×${window.screen.height}`,
        browserInfo: navigator.userAgent,
        appVersion: import.meta.env.VITE_APP_VERSION ?? '0.1.0',
        metadata: {
          source: searchParams.get('source') ?? 'feedback_page',
          chat_query: chatQuery ?? null,
          chat_article_id: chatArticleId ?? null
        }
      });
    },
    onSuccess: async () => {
      setTitle('');
      setDescription('');
      setScreenshot(null);
      setRating(5);
      toast('Feedback submitted', { description: 'We will review your note and reply here when there is an update.', variant: 'success' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.feedback.mine(user!.id) });
    },
    onError: (error) => {
      toast('Could not submit feedback', { description: error instanceof Error ? error.message : 'Please try again.', variant: 'error' });
    }
  });

  if (!user || feedback.isLoading) return <LoadingState label="Loading feedback center" />;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submit.mutate();
  }

  return (
    <Page className="relative pb-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(180,167,214,0.18),_transparent_58%)]" />
      <PageHeader title="Feedback" description="Share a feature request, bug, suggestion, complaint or general note—and track every response." />
      <section className="grid gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <div className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-accent" /><h2 className="font-semibold text-foreground">Submit feedback</h2></div>
          <form className="mt-5 space-y-4" onSubmit={onSubmit}>
            <div><div className="text-xs font-medium text-muted">Rating</div><div className="mt-2 flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} stars`} onClick={() => setRating(value)}><Star className={cn('h-6 w-6 transition', value <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted')} /></button>)}</div></div>
            <label className="block text-xs font-medium text-muted">Title<input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-medium text-muted">Category<select value={category} onChange={(e) => setCategory(e.target.value as FeedbackCategory)} className={inputClass}><option value="feature">Feature</option><option value="bug">Bug</option><option value="suggestion">Suggestion</option><option value="complaint">Complaint</option><option value="general">General</option></select></label>
              <label className="text-xs font-medium text-muted">Priority<select value={priority} onChange={(e) => setPriority(e.target.value as FeedbackPriority)} className={inputClass}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
            </div>
            <label className="block text-xs font-medium text-muted">Description<textarea required minLength={10} maxLength={4000} rows={6} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} /></label>
            <label className="block text-xs font-medium text-muted">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} /></label>
            <label className="flex cursor-pointer items-center justify-between rounded-md border border-dashed border-border bg-primary/15 p-3 text-sm text-muted hover:border-accent"><span className="flex items-center gap-2"><Upload className="h-4 w-4 text-accent" />{screenshot?.name ?? 'Attach screenshot (max 10 MB)'}</span><input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)} /></label>
            <p className="text-[11px] text-muted">Device, browser and app version are attached automatically for diagnostics.</p>
            {submit.error ? <p className="text-sm text-destructive">{submit.error.message}</p> : null}
            <Button className="w-full bg-success text-primary hover:bg-success/90" type="submit" disabled={submit.isPending}><Send className="h-4 w-4" />{submit.isPending ? 'Submitting…' : 'Submit feedback'}</Button>
          </form>
        </Card>

        <div className="space-y-4 xl:col-span-7">
          <div><h2 className="font-semibold text-foreground">Submitted feedback</h2><p className="mt-1 text-sm text-muted">Status changes and public admin replies appear here.</p></div>
          {!feedback.data?.length ? <EmptyState title="No feedback submitted" message="Your submitted items and replies will appear here." /> : feedback.data.map((item) => (
            <Card key={item.id}>
              <div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">{item.category === 'bug' ? <Bug className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}</span><div><div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{item.category} · {item.priority}</div><h3 className="mt-1 font-semibold text-foreground">{item.title}</h3></div></div><Status status={item.status} /></div>
              <p className="mt-3 text-sm text-muted">{item.description}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted"><span>{new Date(item.created_at).toLocaleString()}</span><span>{item.rating}/5 stars</span></div>
              {item.feedback_reply?.length ? <div className="mt-4 border-t border-border pt-3"><div className="text-xs font-semibold text-foreground">Replies</div><div className="mt-2 space-y-2">{item.feedback_reply.filter((reply) => !reply.is_internal && !reply.deleted_at).map((reply) => <div key={reply.id} className="rounded-md bg-primary/20 p-3 text-sm text-muted"><p>{reply.message}</p><div className="mt-1 text-[10px]">{new Date(reply.created_at).toLocaleString()}</div></div>)}</div></div> : null}
            </Card>
          ))}
        </div>
      </section>
    </Page>
  );
}

function Status({ status }: { status: FeedbackStatus }) {
  return <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase', status === 'completed' ? 'bg-success/15 text-success' : status === 'rejected' ? 'bg-destructive/15 text-destructive' : status === 'accepted' ? 'bg-accent/15 text-accent' : 'bg-purple/15 text-purple')}>{status.replaceAll('_', ' ')}</span>;
}

const inputClass = 'mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';

