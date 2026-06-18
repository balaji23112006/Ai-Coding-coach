import { useEffect, useRef, useState } from 'react';
import { BrainCircuit, Send, Lightbulb, X, Sparkles, AlertCircle, Zap, MessageSquare } from 'lucide-react';
import type { MentorMessage } from '../hooks/use-mentor';

interface MentorPanelProps {
  messages: MentorMessage[];
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onRequestHint: () => void;
  onSendMessage: (text: string) => void;
}

const CATEGORY_CONFIG = {
  syntax: { label: 'Syntax', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: AlertCircle },
  logic: { label: 'Logic', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: AlertCircle },
  timeout: { label: 'Efficiency', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: Zap },
  request: { label: 'Hint', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', icon: Lightbulb },
};

const LEVEL_LABELS: Record<number, string> = {
  1: 'Concept',
  2: 'Clue',
  3: 'Direction',
  4: 'Pseudocode',
  5: 'Edge Cases',
};

function HintBadge({ category, level }: { category: keyof typeof CATEGORY_CONFIG; level: 1 | 2 | 3 | 4 | 5 }) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.request;
  const Icon = config.icon;
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${config.color}`}>
        <Icon className="h-2.5 w-2.5" />
        {config.label}
      </span>
      <span className="inline-flex items-center rounded border border-slate-700/50 bg-slate-800/50 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
        Level {level} · {LEVEL_LABELS[level]}
      </span>
    </div>
  );
}

function MentorMessageBubble({ msg }: { msg: MentorMessage }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-violet-600/20 border border-violet-500/20 px-3 py-2">
          <p className="text-sm leading-relaxed text-slate-200">{msg.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-900/30">
        <BrainCircuit className="h-3 w-3 text-slate-950" />
      </div>
      <div className="min-w-0 flex-1">
        {msg.hintMetadata && (
          <HintBadge
            category={msg.hintMetadata.category}
            level={msg.hintMetadata.level}
          />
        )}
        <div className="rounded-2xl rounded-tl-sm border border-slate-700/40 bg-slate-900/60 px-3 py-2.5">
          {msg.hintMetadata?.targetedConcept && (
            <p className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">
              ↳ {msg.hintMetadata.targetedConcept}
            </p>
          )}
          <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">{msg.text}</p>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-900/30">
        <BrainCircuit className="h-3 w-3 text-slate-950" />
      </div>
      <div className="rounded-2xl rounded-tl-sm border border-slate-700/40 bg-slate-900/60 px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export function MentorPanel({
  messages,
  isLoading,
  isOpen,
  onClose,
  onRequestHint,
  onSendMessage,
}: MentorPanelProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    setInputText('');
    onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/80 backdrop-blur-xl shadow-2xl shadow-black/40">
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-800/60 bg-slate-950/40 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm shadow-amber-900/40">
            <BrainCircuit className="h-3.5 w-3.5 text-slate-950" />
          </div>
          <span className="font-mono text-xs font-bold text-slate-200">Mentor AI</span>
          <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-400">
            Socratic
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-slate-500 transition hover:bg-slate-800/50 hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        {isEmpty && !isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-500/20 shadow-lg">
                <Sparkles className="h-6 w-6 text-amber-400" />
              </div>
              <div className="absolute -right-1 -top-1 h-4 w-4 animate-pulse rounded-full border border-amber-500/30 bg-amber-500/20" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Your AI Mentor</p>
              <p className="mt-1 max-w-[200px] text-xs leading-relaxed text-slate-500">
                I guide you with hints and questions — not complete solutions.
              </p>
            </div>
            <button
              onClick={onRequestHint}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-600/5 px-4 py-2.5 text-xs font-semibold text-amber-400 transition hover:border-amber-500/50 hover:bg-amber-500/15 disabled:opacity-50"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              Request a Hint
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(msg => (
              <MentorMessageBubble key={msg.id} msg={msg} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {messages.length > 0 && !isLoading && (
        <div className="border-t border-slate-800/40 bg-slate-950/20 px-3 py-2">
          <button
            onClick={onRequestHint}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 py-1.5 text-xs text-amber-400 transition hover:border-amber-500/40 hover:bg-amber-500/10"
          >
            <Lightbulb className="h-3 w-3" />
            Request another hint
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-800/60 bg-slate-950/40 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-900/60 px-3 py-2 focus-within:border-amber-500/40 focus-within:shadow-sm transition">
          <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your mentor anything..."
            disabled={isLoading}
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500 text-slate-950 transition hover:bg-amber-400 disabled:opacity-40"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
        <p className="mt-1.5 text-center font-mono text-[9px] text-slate-600">
          Mentor will guide you, not solve it for you
        </p>
      </div>
    </div>
  );
}
