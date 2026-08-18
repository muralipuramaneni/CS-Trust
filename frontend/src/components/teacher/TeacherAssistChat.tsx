import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { IconArrowRight, IconSpark, IconX } from '../ui/icons';
import {
  TEACHER_ASSIST_PROMPTS,
  teacherAssistReply,
  welcomeTeacherAssist,
  type TeacherAssistContext,
} from '../../utils/teacherAssistChat';
import { cn } from '../../utils/cn';

type ChatLine = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  href?: { to: string; label: string };
};

function nextId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function TeacherAssistChat({ context }: { context: TeacherAssistContext }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || messages.length) return;
    const welcome = welcomeTeacherAssist(context);
    setMessages([{ id: nextId(), role: 'assistant', ...welcome }]);
  }, [open, messages.length, context]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, open, busy]);

  function pushReply(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || busy) return;
    setDraft('');
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: trimmed }]);
    setBusy(true);
    window.setTimeout(() => {
      const reply = teacherAssistReply(trimmed, context);
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', ...reply }]);
      setBusy(false);
    }, 280);
  }

  const node = (
    <>
      {open ? (
        <section
          className="fixed inset-x-0 bottom-0 z-[70] flex h-[min(28rem,72svh)] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-[0_-12px_40px_-18px_rgba(15,23,42,0.4)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[min(32rem,78svh)] sm:w-[22.5rem] sm:rounded-2xl dark:border-slate-700 dark:bg-slate-900"
          aria-label="Teacher AI assistant"
        >
          <header className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-sky-50 px-4 py-3 dark:border-slate-800 dark:from-orange-950/40 dark:to-sky-950/30">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-sky-500 text-white">
                <IconSpark className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Teacher assistant
                </p>
                <p className="text-[0.7rem] text-slate-500 dark:text-slate-400">
                  Clock, attendance & syllabus help
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white/80 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Close assistant"
            >
              <IconX className="h-4 w-4" />
            </button>
          </header>

          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3">
            {messages.map((line) => (
              <div
                key={line.id}
                className={cn('flex', line.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                    line.role === 'user'
                      ? 'rounded-br-md bg-brand-600 text-white'
                      : 'rounded-bl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100',
                  )}
                >
                  <p>{line.text}</p>
                  {line.href ? (
                    <Link
                      to={line.href.to}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
                    >
                      {line.href.label}
                      <IconArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
            {busy ? (
              <p className="text-xs text-slate-400">Thinking…</p>
            ) : null}
          </div>

          <div className="border-t border-slate-100 px-3 py-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] dark:border-slate-800">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {TEACHER_ASSIST_PROMPTS.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => pushReply(prompt.label)}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[0.7rem] font-semibold text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-500/40 dark:hover:bg-orange-950/30 dark:hover:text-brand-200"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                pushReply(draft);
              }}
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask about clock, attendance, syllabus…"
                className="field-control h-10 min-w-0 flex-1 text-sm"
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="inline-flex h-10 shrink-0 items-center rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-[70] inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-sky-500 text-white shadow-[0_12px_28px_-8px_rgba(249,115,22,0.65)] transition hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30 sm:bottom-6 sm:right-6"
          aria-label="Open teacher assistant"
          aria-expanded={false}
        >
          <IconSpark className="h-6 w-6" />
        </button>
      )}
    </>
  );

  if (typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}
