import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Circle, ListChecks, Map, ArrowRight, Search } from 'lucide-react'
import { apiClient } from '@/services/api-client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/practice/')({
  component: PracticeListingPage,
})

interface Question {
  id: string
  slug: string
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  description: string
  topics: string[]
}

function PracticeListingPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All')

  useEffect(() => {
    // Fetch questions and user progress in parallel
    Promise.all([
      apiClient.get<{ items: Question[] }>('/questions?pageSize=100'),
      apiClient.get<any>('/progress/summary').catch(() => null)
    ]).then(([questionsRes, progressRes]) => {
      setQuestions(questionsRes.items || [])
      
      // Compute solved questions from submissions if progress api is successful
      if (progressRes && progressRes.stats) {
        // Fetch all user submissions to check which question slugs are ACCEPTED
        apiClient.get<any>('/submissions/summary').catch(() => null)
      }
      setLoading(false)
    }).catch(err => {
      console.error('Failed to load practice questions:', err)
      setLoading(false)
    })
  }, [])

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          q.topics.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesDifficulty = difficultyFilter === 'All' || q.difficulty === difficultyFilter
    return matchesSearch && matchesDifficulty
  })

  return (
    <div className="relative min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#171033] via-[#09090b] to-[#050505] text-slate-100 font-sans antialiased pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      
      {/* Decorative Blur Backdrops */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="mx-auto max-w-[1200px]">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-violet-400">
              CHALLENGE HUB
            </h1>
            <p className="mt-2 text-slate-400 text-sm font-medium">
              Select a challenge to write code, test edge cases, and receive AI mentor guidance.
            </p>
          </div>
          <Link to="/dashboard">
            <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 hover:text-white rounded-full text-xs font-semibold h-9 gap-2">
              <Map className="h-3.5 w-3.5" /> Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Search & Filter bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between mb-8 p-4 rounded-2xl border border-white/[0.04] bg-[#121214]/60 backdrop-blur-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by title or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent pl-10 pr-4 py-2 text-sm font-medium outline-none placeholder:text-slate-600 border border-white/5 rounded-xl focus:border-violet-500/50 focus:bg-white/[0.02] transition"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficultyFilter(diff)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition",
                  difficultyFilter === diff
                    ? "bg-violet-600 text-white shadow-md shadow-violet-950/40"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5"
                )}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Question Cards Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
            <p className="mt-4 text-sm font-medium text-slate-500 uppercase tracking-widest">Loading questions...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/[0.06] rounded-3xl bg-[#121214]/30">
            <ListChecks className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-base font-semibold text-slate-400">No questions found</p>
            <p className="text-sm text-slate-600 mt-1">Try resetting your search query or filters.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredQuestions.map((q) => {
              const diffColor = q.difficulty === 'Easy' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' : 
                                q.difficulty === 'Medium' ? 'text-amber-400 border-amber-500/30 bg-amber-500/5' : 
                                'text-rose-400 border-rose-500/30 bg-rose-500/5'
              
              return (
                <motion.div
                  key={q.id}
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="group relative rounded-2xl border border-white/[0.04] bg-[#121214]/80 p-6 backdrop-blur-md shadow-lg hover:border-violet-500/40 hover:bg-violet-950/[0.05] hover:shadow-[0_15px_30px_rgba(139,92,246,0.15)] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex gap-2">
                        {q.topics.map(t => (
                          <span key={t} className="text-[10px] font-bold uppercase tracking-wider bg-white/[0.03] text-slate-400 border border-white/5 px-2 py-0.5 rounded-md">
                            {t}
                          </span>
                        ))}
                      </div>
                      <span className={cn("text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-md shrink-0", diffColor)}>
                        {q.difficulty}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold group-hover:text-violet-300 transition-colors text-white mb-2">
                      {q.title}
                    </h3>
                    
                    <p className="text-sm text-slate-400 font-medium leading-relaxed mb-6 line-clamp-2">
                      {q.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/[0.04]">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                      <Circle className="h-3.5 w-3.5 text-slate-600" /> Unsolved
                    </span>
                    <Link to="/practice/$slug" params={{ slug: q.slug }}>
                      <Button className="bg-violet-600 text-white hover:bg-violet-500 rounded-full font-bold text-xs h-9 gap-1 shadow-md shadow-violet-950/50">
                        Solve Challenge <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
