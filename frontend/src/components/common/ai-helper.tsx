import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, Sparkles, MessageSquare, HelpCircle } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface Message {
  role: 'bot' | 'user'
  text: string
}

interface AiHelperProps {
  isDark: boolean
}

const SUGGESTED_PROMPTS = [
  'How to master Dynamic Programming?',
  'What is my current streak status?',
  'How are my rank points computed?',
  'Recommend my next practice task',
]

export function AiHelper({ isDark }: AiHelperProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Hi there! I am your AI Coach. Need help navigating your learning path or solving practice problems?' },
  ])

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const triggerReply = (userText: string) => {
    setTimeout(() => {
      const lower = userText.toLowerCase()
      let botReply = "I am scanning your profile stats. Try checking out the Roadmap or Practice tabs to start solving questions and unlock personalized feedback!"

      if (['hi', 'hello', 'hey'].some(w => lower.includes(w))) {
        botReply = 'Hello! I can guide you through your Skill Lens roadmap. What would you like to learn today?'
      } else if (lower.includes('streak')) {
        botReply = 'Your streak logs are tracked dynamically in the Dashboard. Finish at least one challenge every 24 hours to keep the flame alive!'
      } else if (lower.includes('dp') || lower.includes('dynamic programming')) {
        botReply = 'Dynamic Programming is the final node on your roadmap. Make sure to complete Arrays, Strings, Stack, and Trees first to build up your background!'
      } else if (lower.includes('rank') || lower.includes('points') || lower.includes('leaderboard')) {
        botReply = 'Rankings are computed dynamically from your solved problems: Easy gives 10 pts, Medium gives 20 pts, and Hard gives 30 pts. Keep practicing to climb the podium!'
      } else if (lower.includes('recommend') || lower.includes('next')) {
        botReply = 'Based on your stats, I recommend focusing on "Arrays & Hashing" or "Hash Maps" next, as they lay the foundation for interview topics!'
      }

      setMessages((prev) => [...prev, { role: 'bot', text: botReply }])
    }, 800)
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userText = input.trim()
    setMessages((prev) => [...prev, { role: 'user', text: userText }])
    setInput('')
    triggerReply(userText)
  }

  const handlePromptClick = (prompt: string) => {
    setMessages((prev) => [...prev, { role: 'user', text: prompt }])
    triggerReply(prompt)
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button
            onClick={() => setIsOpen(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all hover:scale-105 active:scale-95 duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.6)]"
          >
            <MessageSquare className="h-6 w-6 animate-pulse" />
          </button>
        </SheetTrigger>

        <SheetContent
          side="right"
          className={cn(
            'w-full sm:max-w-md border-l flex flex-col p-0 h-full backdrop-blur-xl',
            isDark
              ? 'bg-[#0b0816]/95 border-violet-950/40 text-slate-100'
              : 'bg-white/95 border-slate-200 text-slate-900'
          )}
        >
          {/* Header */}
          <SheetHeader className={cn(
            'px-6 py-4 border-b flex flex-row items-center gap-3',
            isDark ? 'border-white/5 bg-white/[0.01]' : 'border-slate-100 bg-slate-50'
          )}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-md">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle className={cn(
                'text-sm font-bold flex items-center gap-1.5',
                isDark ? 'text-white' : 'text-slate-900'
              )}>
                AI Learning Coach
                <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
              </SheetTitle>
              <SheetHeader className="text-left text-[11px] font-semibold text-slate-500 p-0 m-0 leading-tight">
                Online // Live Assistant
              </SheetHeader>
            </div>
          </SheetHeader>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
            <AnimatePresence initial={false}>
              {messages.map((m, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-semibold leading-relaxed shadow-sm',
                    m.role === 'user'
                      ? 'self-end bg-violet-600 text-white rounded-br-sm'
                      : cn(
                          isDark
                            ? 'self-start bg-white/[0.03] border border-white/[0.05] text-slate-200 rounded-bl-sm'
                            : 'self-start bg-slate-100 text-slate-800 rounded-bl-sm'
                        )
                  )}
                >
                  {m.text}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* Autocomplete prompts suggestion box */}
          {messages.length === 1 && (
            <div className="px-6 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                <HelpCircle className="h-3 w-3" /> Quick Prompts
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handlePromptClick(prompt)}
                    className={cn(
                      'text-[10px] font-semibold rounded-lg px-3 py-1.5 border transition-all text-left hover:scale-[1.02]',
                      isDark
                        ? 'bg-[#151126] border-violet-950/40 text-violet-300 hover:bg-violet-900/10 hover:border-violet-800'
                        : 'bg-violet-50 border-violet-100 text-violet-700 hover:bg-violet-100'
                    )}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Input Form */}
          <form
            onSubmit={handleSend}
            className={cn(
              'p-4 border-t flex gap-2 items-center bg-[#090614]/20',
              isDark ? 'border-white/5' : 'border-slate-100 bg-slate-50/50'
            )}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me about roadmaps, streaks, leaderboard..."
              className={cn(
                'flex-1 text-xs bg-transparent outline-none px-3 py-2 rounded-xl border transition-all font-medium focus:ring-2 focus:ring-violet-500/50',
                isDark
                  ? 'text-white border-white/5 bg-[#120f26]/40 placeholder:text-slate-600 focus:border-violet-500/50'
                  : 'text-slate-900 border-slate-200 bg-white placeholder:text-slate-400 focus:border-violet-500/50'
              )}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-violet-600 text-white disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-md shadow-violet-600/10"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
