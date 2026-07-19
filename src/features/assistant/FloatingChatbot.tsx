import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, HelpCircle, Loader2, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';
import { Button } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import { ChatEngine, type ChatMessage } from './engine/ChatEngine';
import { FINLO_FAQS, SUGGESTED_PROMPTS } from './knowledge/finloKnowledge';

function makeId() {
  return crypto.randomUUID();
}

function renderRichText(content: string) {
  const lines = content.split('\n');
  return lines.map((line, lineIndex) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return (
      <span key={lineIndex}>
        {lineIndex > 0 ? <br /> : null}
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={i} className="font-semibold text-foreground">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  });
}

type PanelMode = 'chat' | 'faq';

export function FloatingChatbot() {
  const user = useAuthStore((s) => s.user);
  const household = useAuthStore((s) => s.household);
  const profile = useAuthStore((s) => s.profile);
  const currency = household?.default_currency ?? profile?.currency ?? 'USD';

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PanelMode>('chat');
  const [faqOpenId, setFaqOpenId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const greeting = useMemo(() => ChatEngine.greeting(), []);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: makeId(),
      role: 'assistant',
      content: greeting.content,
      createdAt: new Date().toISOString(),
      source: 'greeting'
    }
  ]);

  useEffect(() => {
    if (!open || mode !== 'chat') return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, mode, pending]);

  async function send(text: string) {
    const query = text.trim();
    if (!query || pending) return;

    setMode('chat');
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: 'user', content: query, createdAt: new Date().toISOString() }
    ]);
    setInput('');
    setPending(true);

    try {
      const reply = await ChatEngine.answer({
        query,
        householdId: household?.id,
        userId: user?.id,
        currency
      });
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: 'assistant',
          content: reply.content,
          createdAt: new Date().toISOString(),
          source: reply.source,
          relatedRoutes: reply.relatedRoutes,
          articleId: reply.articleId
        }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: 'assistant',
          content: 'Something went wrong while answering. Please try again.',
          createdAt: new Date().toISOString(),
          source: 'unknown'
        }
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 lg:bottom-6 lg:right-6">
      {open ? (
        <div className="pointer-events-auto flex h-[min(34rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-brand shadow-[0_24px_64px_rgba(0,0,0,0.55),0_8px_24px_rgba(31,37,68,0.35)] ring-1 ring-black/10">
          <div className="card-shell flex h-full flex-col overflow-hidden !rounded-brand p-0">
            <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-[var(--color-sidebar)] px-3 py-2.5 text-white">
              <div className="flex min-w-0 items-center gap-2">
                <Bot className="h-4 w-4 shrink-0 text-success" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">Finlo Chatbot</div>
                  <div className="truncate text-[10px] text-white/70">Ask · FAQs · Your data</div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close chatbot"
                className="rounded-md p-1 text-white/80 hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-1 border-b border-border/60 bg-surface-muted/60 p-1.5">
              <TabButton active={mode === 'chat'} onClick={() => setMode('chat')} icon={MessageCircle} label="Chat" />
              <TabButton active={mode === 'faq'} onClick={() => setMode('faq')} icon={HelpCircle} label="FAQs" />
            </div>

            {mode === 'chat' ? (
              <>
                <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto p-3" aria-live="polite">
                  {messages.map((message, index) => (
                    <Bubble
                      key={message.id}
                      message={message}
                      priorUserQuery={messages[index - 1]?.role === 'user' ? messages[index - 1].content : undefined}
                      onClose={() => setOpen(false)}
                    />
                  ))}
                  {pending ? (
                    <div className="flex items-center gap-2 text-[11px] text-muted">
                      <Loader2 className="h-3 w-3 animate-spin text-accent" />
                      Looking that up…
                    </div>
                  ) : null}
                  {messages.length <= 1 ? (
                    <div className="pt-1">
                      <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        <Sparkles className="h-3 w-3" /> Try asking
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            className="rounded-md border border-border bg-primary px-2 py-1 text-left text-[11px] text-muted hover:border-accent/40 hover:text-foreground"
                            onClick={() => void send(prompt)}
                            disabled={pending}
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <form
                  className="border-t border-border/70 p-2.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send(input);
                  }}
                >
                  <div className="flex gap-2">
                    <input
                      className="input h-9 flex-1 text-sm"
                      placeholder="Ask Finlo…"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={pending}
                      aria-label="Chat message"
                    />
                    <Button type="submit" className="h-9 px-3" disabled={pending || !input.trim()}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto p-3">
                <p className="mb-3 text-xs text-muted">Common questions about Finlo features and workflows.</p>
                <ul className="space-y-2">
                  {FINLO_FAQS.map((faq) => {
                    const expanded = faqOpenId === faq.id;
                    return (
                      <li key={faq.id} className="rounded-md border border-border/70 bg-primary/40">
                        <button
                          type="button"
                          className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left"
                          onClick={() => setFaqOpenId(expanded ? null : faq.id)}
                          aria-expanded={expanded}
                        >
                          <span className="text-sm font-medium text-foreground">{faq.question}</span>
                          <span className="text-xs text-muted">{expanded ? '−' : '+'}</span>
                        </button>
                        {expanded ? (
                          <div className="border-t border-border/60 px-3 py-2.5 text-xs leading-relaxed text-muted">
                            {faq.answer}
                            {faq.relatedRoutes?.length ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {faq.relatedRoutes.map((route) => (
                                  <Link
                                    key={route}
                                    to={route}
                                    className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] text-accent hover:underline"
                                    onClick={() => setOpen(false)}
                                  >
                                    Open {route === '/' ? 'Dashboard' : route.replace('/', '')}
                                  </Link>
                                ))}
                              </div>
                            ) : null}
                            <button
                              type="button"
                              className="mt-2 text-[11px] font-medium text-accent hover:underline"
                              onClick={() => void send(faq.question)}
                            >
                              Ask in chat →
                            </button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-label={open ? 'Close Finlo chatbot' : 'Open Finlo chatbot'}
        className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--color-sidebar)] text-white shadow-card ring-2 ring-accent/40 transition hover:scale-105 hover:ring-accent"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5 text-success" />}
      </button>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof MessageCircle;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition',
        active ? 'bg-accent text-white' : 'text-muted hover:bg-primary hover:text-foreground'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Bubble({
  message,
  priorUserQuery,
  onClose
}: {
  message: ChatMessage;
  priorUserQuery?: string;
  onClose: () => void;
}) {
  const isUser = message.role === 'user';
  const feedbackHref =
    message.source === 'unknown' && priorUserQuery
      ? `/feedback?source=chatbot&category=suggestion&query=${encodeURIComponent(priorUserQuery)}`
      : null;

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[90%] rounded-brand border px-2.5 py-2 text-xs leading-relaxed',
          isUser
            ? 'border-accent/30 bg-accent/15 text-foreground'
            : message.source === 'unknown'
              ? 'border-destructive/25 bg-destructive/5 text-foreground'
              : 'border-border/70 bg-primary/50 text-foreground'
        )}
      >
        {!isUser ? (
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            {message.source === 'data' ? 'Your data' : message.source === 'knowledge' ? 'Knowledge' : message.source === 'unknown' ? 'No match' : 'Assistant'}
          </div>
        ) : null}
        <div>{renderRichText(message.content)}</div>
        {feedbackHref ? (
          <div className="mt-2 rounded-md border border-border/70 bg-surface/80 p-2 text-[11px] text-muted">
            Help us improve Finlo by sending this question to the feedback desk.
            <Link
              to={feedbackHref}
              className="mt-1 inline-flex font-medium text-accent hover:underline"
              onClick={onClose}
            >
              Submit feedback →
            </Link>
          </div>
        ) : null}
        {message.relatedRoutes?.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.relatedRoutes.map((route) => (
              <Link key={route} to={route} className="text-[10px] text-accent hover:underline" onClick={onClose}>
                {route === '/' ? 'Dashboard' : route.replace('/', '')}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
