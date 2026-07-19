import { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Send, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/features/auth/authStore';
import { Button } from '@/shared/components';
import { ChatEngine, type ChatMessage } from '@/features/assistant/engine/ChatEngine';
import { SUGGESTED_PROMPTS } from '@/features/assistant/knowledge/finloKnowledge';
import { GlassPanel } from './CountrySummary';

function makeId() {
  return crypto.randomUUID();
}

export function AskFinloWidget() {
  const user = useAuthStore((state) => state.user);
  const household = useAuthStore((state) => state.household);
  const profile = useAuthStore((state) => state.profile);
  const currency = household?.default_currency ?? profile?.currency ?? 'USD';
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: makeId(),
      role: 'assistant',
      content: ChatEngine.greeting().content,
      createdAt: new Date().toISOString(),
      source: 'greeting'
    }
  ]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pending]);

  async function send(text: string) {
    const query = text.trim();
    if (!query || pending) return;

    setMessages((prev) => [...prev, { id: makeId(), role: 'user', content: query, createdAt: new Date().toISOString() }]);
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
          relatedRoutes: reply.relatedRoutes
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
    <GlassPanel className="space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-[var(--color-accent-teal)]" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Ask Finlo AI</h2>
          <p className="text-sm text-muted">Advisory answers from your ledger and the Finlo knowledge base.</p>
        </div>
      </div>

      <div ref={listRef} className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-border/60 bg-primary/20 p-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-md px-3 py-2 text-sm ${message.role === 'user' ? 'ml-8 bg-accent/15 text-foreground' : 'mr-8 bg-surface text-foreground'}`}
          >
            {message.content}
          </div>
        ))}
        {pending ? (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Loader2 className="h-3 w-3 animate-spin" />
            Looking that up…
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED_PROMPTS.slice(0, 3).map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-white/5 px-2.5 py-1 text-[11px] text-muted hover:text-foreground"
            onClick={() => void send(prompt)}
          >
            <Sparkles className="h-3 w-3" />
            {prompt}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <input
          className="input h-10 flex-1"
          placeholder="Ask about markets, budgeting, debt, goals…"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={pending}
        />
        <Button type="submit" className="h-10 px-3" disabled={pending || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </GlassPanel>
  );
}
