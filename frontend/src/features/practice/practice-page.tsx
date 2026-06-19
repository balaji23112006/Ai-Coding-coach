import { useState, useEffect, useRef, Suspense, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Text } from '@react-three/drei'
import * as THREE from 'three'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  Filter,
  Search,
  Zap,
  Trophy,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { fetchQuestions, simulateAttempt } from './services/practice-service'
import { TopNavigation } from '@/components/common/top-navigation'
import { availableTopics } from './data/practice-data'
import type { Question, Difficulty } from './types'

const codeSymbols = ['{ }', '</>', '[]', '()', '=>', ';;', '++', '&&']

// --- Animation Variants ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

// --- 3D Background Component ---
function Practice3DBackground({ isDark }: { isDark: boolean }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.05
      const targetX = (state.pointer.x * 0.1)
      const targetY = (state.pointer.y * 0.1)
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -targetY, 0.05)
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetX, 0.05)
    }
  })

  const floatingObjects = useMemo(() => {
    return [...Array(20)].map((_, i) => ({
      id: i,
      symbol: codeSymbols[i % codeSymbols.length],
      x: Math.sin(i * 12.9898) * 15,
      y: Math.cos(i * 78.233) * 15,
      z: Math.sin(i * 37.719) * 7.5 - 5,
      speed: 1 + ((i * 7) % 10) / 10,
    }))
  }, [])

  return (
    <group ref={groupRef}>
      {floatingObjects.map((obj) => (
        <Float key={obj.id} speed={obj.speed} rotationIntensity={1} floatIntensity={2}>
        <Text
          position={[obj.x, obj.y, obj.z]}
          fontSize={0.5}
          color={isDark ? "#8b5cf6" : "#6d28d9"}
          fillOpacity={isDark ? 0.3 : 0.85}
          anchorX="center"
          anchorY="middle"
        >
            {obj.symbol}
          </Text>
        </Float>
      ))}
    </group>
  )
}

// --- Main Page Component ---
export function PracticePage() {
  const navigate = useNavigate()
  const [isDark, setIsDark] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Pagination State
  const [searchTerm, setSearchTerm] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty | 'All'>('All')
  const [topic, setTopic] = useState<string>('All')
  const [perPage, setPerPage] = useState<number>(10)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Load Data via Service
  const loadQuestions = async () => {
    try {
      const response = await fetchQuestions({
        search: searchTerm,
        difficulty,
        topic,
        page: currentPage,
        perPage
      })
      setQuestions(response.data)
      setTotalItems(response.total)
      setTotalPages(response.totalPages)
    } catch (error) {
      console.error("Failed to fetch questions", error)
    } finally {
      setLoading(false)
    }
  }

  // Effect triggers when filters or pagination change
  useEffect(() => {
    const request = window.setTimeout(() => {
      void loadQuestions()
    }, 0)
    return () => window.clearTimeout(request)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, topic, perPage, currentPage])

  // Debounced Search Effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setCurrentPage(1) // Reset to page 1 on search
      void loadQuestions()
    }, 400)
    return () => clearTimeout(handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  // Listen to practice progress updates from code submissions
  useEffect(() => {
    const handleRefresh = () => {
      void loadQuestions()
    }
    window.addEventListener('skill-lens:practice-progress-updated', handleRefresh)
    return () => {
      window.removeEventListener('skill-lens:practice-progress-updated', handleRefresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, topic, perPage, currentPage, searchTerm])

  const handleActionClick = async (question: Question) => {
    if (question.status === 'Not Attempted') {
      // Optimistic update for UI
      setQuestions(prev => prev.map(q => q.id === question.id ? { ...q, status: 'Attempted' } : q))
      await simulateAttempt(question.id)
    }

    void navigate({
      to: '/editor/$problemSlug',
      params: { problemSlug: question.slug || question.id },
    })
  }

  const themeClass = isDark 
    ? 'dark bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a103c] via-[#0d081e] to-[#070510] text-slate-100' 
    : 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-100 via-violet-50 to-slate-100 text-slate-900'

  const panelClass = isDark 
    ? 'rounded-2xl border border-violet-500/20 bg-[#120d20]/80 backdrop-blur-xl shadow-xl shadow-violet-950/20' 
    : 'rounded-2xl border border-violet-400/80 bg-white/80 backdrop-blur-xl shadow-xl shadow-violet-300/50'

  const getDifficultyColor = (diff: string) => {
    if (diff === 'Easy') return isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-100 border-emerald-200'
    if (diff === 'Medium') return isDark ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' : 'text-orange-700 bg-orange-100 border-orange-200'
    if (diff === 'Hard') return isDark ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-rose-700 bg-rose-100 border-rose-200'
    return ''
  }

  const getStatusColor = (status: string) => {
    if (status === 'Not Attempted') return isDark ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-slate-600 bg-slate-200 border-slate-300'
    if (status === 'Attempted') return isDark ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' : 'text-yellow-700 bg-yellow-100 border-yellow-200'
    if (status === 'Solved') return isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-100 border-emerald-200'
    return ''
  }

  return (
    <div className={cn("min-h-screen overflow-x-hidden font-sans antialiased transition-all duration-500", themeClass)}>
      
      {/* 3D Background */}
      <div className={cn("fixed inset-0 z-0 pointer-events-none transition-opacity", isDark ? "opacity-100" : "opacity-95")}>
        <Suspense fallback={null}>
          <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
            <ambientLight intensity={isDark ? 0.6 : 1.2} />
            <Practice3DBackground isDark={isDark} />
          </Canvas>
        </Suspense>
      </div>
      {!isDark && (
        <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_18%_24%,rgba(124,58,237,0.18),transparent_28%),radial-gradient(circle_at_82%_32%,rgba(139,92,246,0.16),transparent_26%)]" />
      )}

      {/* Top Navigation */}
      <TopNavigation isDark={isDark} setIsDark={setIsDark} activeTab="practice" />

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-[1400px] px-4 pt-36 pb-32 sm:px-6 lg:px-8">
        
        {/* Animated Header */}
        <div className="mb-12 text-center flex flex-col items-center">
          <motion.h1
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)', scale: 0.97 }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className={cn("text-5xl md:text-7xl font-black tracking-tighter flex justify-center flex-wrap text-transparent bg-clip-text bg-gradient-to-b", isDark ? "from-white via-slate-200 to-violet-400" : "from-slate-900 via-slate-700 to-violet-600")}
          >
            PRACTICE
          </motion.h1>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className={cn(panelClass, "overflow-hidden")}
        >
          {/* Filters & Search Toolbar */}
          <div className={cn("p-6 border-b", isDark ? "border-violet-500/20" : "border-violet-300 bg-violet-100/70")}>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              
              {/* Search Bar */}
              <div className="relative w-full md:w-96">
                <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-slate-400" : "text-violet-600")} />
                <input 
                  type="text" 
                  placeholder="Search problems by name or topic..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/50",
                    isDark ? "bg-[#09090b]/50 border-violet-500/20 text-white placeholder:text-slate-500" : "bg-violet-50/90 border-violet-300 text-violet-950 placeholder:text-violet-400 shadow-sm shadow-violet-200/40"
                  )}
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <Filter className={cn("w-4 h-4", isDark ? "text-slate-400" : "text-violet-600")} />
                  
                  {/* Difficulty Dropdown */}
                  <div className="relative">
                    <select
                      value={difficulty}
                      onChange={(e) => { setDifficulty(e.target.value as Difficulty | 'All'); setCurrentPage(1); }}
                      className={cn(
                        "appearance-none pl-4 pr-8 py-2 rounded-lg text-sm font-semibold border transition-all cursor-pointer focus:outline-none",
                        isDark ? "bg-[#161618] border-violet-500/20 text-white" : "bg-violet-100 border-violet-300 text-violet-950 shadow-sm shadow-violet-200/40"
                      )}
                    >
                      <option value="All">All Difficulties</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-50" />
                  </div>

                  {/* Topic Dropdown */}
                  <div className="relative">
                    <select
                      value={topic}
                      onChange={(e) => { setTopic(e.target.value); setCurrentPage(1); }}
                      className={cn(
                        "appearance-none pl-4 pr-8 py-2 rounded-lg text-sm font-semibold border transition-all cursor-pointer focus:outline-none",
                        isDark ? "bg-[#161618] border-violet-500/20 text-white" : "bg-violet-100 border-violet-300 text-violet-950 shadow-sm shadow-violet-200/40"
                      )}
                    >
                      {availableTopics.map(t => (
                        <option key={t} value={t}>{t === 'All' ? 'All Topics' : t}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-50" />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Table Section */}
          <div className="w-full overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={cn("text-xs uppercase tracking-wider", isDark ? "bg-white/[0.02] text-slate-400" : "bg-slate-50 text-slate-500")}>
                  <th className="px-6 py-4 font-bold">S.No.</th>
                  <th className="px-6 py-4 font-bold">Problem Name</th>
                  <th className="px-6 py-4 font-bold">Difficulty</th>
                  <th className="px-6 py-4 font-bold">Acceptance</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              
              <motion.tbody 
                variants={containerVariants} 
                initial="hidden" 
                animate="visible"
                className={cn("text-sm", isDark ? "text-slate-300" : "text-slate-700")}
              >
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Zap className={cn("w-8 h-8 animate-pulse mb-3", isDark ? "text-violet-500" : "text-violet-600")} />
                        <span className="font-bold tracking-wide">Loading questions...</span>
                      </div>
                    </td>
                  </tr>
                ) : questions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Database className="w-8 h-8 opacity-20 mb-3" />
                        <span className="font-medium">No problems found matching your criteria.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence>
                    {questions.map((q, index) => {
                      const absoluteIndex = (currentPage - 1) * perPage + index + 1
                      const isAttempted = q.status !== 'Not Attempted'

                      return (
                        <motion.tr 
                          key={q.id}
                          variants={itemVariants}
                          className={cn(
                            "border-b transition-colors group", 
                            isDark ? "border-white/5 hover:bg-white/5" : "border-slate-100 hover:bg-slate-50"
                          )}
                        >
                          <td className="px-6 py-4 font-medium opacity-50">{absoluteIndex}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className={cn("font-bold transition-colors cursor-pointer flex items-center gap-1.5", 
                                q.status === 'Solved'
                                  ? (isDark ? "text-emerald-400 group-hover:text-emerald-300" : "text-emerald-600 group-hover:text-emerald-500")
                                  : (isDark ? "text-white group-hover:text-violet-400" : "text-slate-900 group-hover:text-violet-600")
                              )}>
                                {q.title}
                                {q.status === 'Solved' && (
                                  <Trophy className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                )}
                              </span>
                              <span className="text-[10px] mt-1 flex gap-2 font-medium opacity-60">
                                {q.topics.slice(0, 2).map(t => (
                                  <span key={t}>{t}</span>
                                ))}
                                {q.topics.length > 2 && <span>+{q.topics.length - 2}</span>}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn("px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border", getDifficultyColor(q.difficulty))}>
                              {q.difficulty}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold">
                            {q.acceptanceRate}%
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border", getStatusColor(q.status))}>
                              {q.status === 'Solved' ? (
                                <>
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Solved
                                </>
                              ) : (
                                'Solve'
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => void handleActionClick(q)}
                              className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm",
                                isAttempted 
                                  ? (isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-200 text-slate-800 hover:bg-slate-300")
                                  : "bg-violet-600 text-white hover:bg-violet-500 shadow-violet-500/20"
                              )}
                            >
                              {isAttempted ? "Reattempt" : "Solve"}
                            </button>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                )}
              </motion.tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          <div className={cn("px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4", isDark ? "border-violet-500/20 bg-white/[0.01]" : "border-violet-300 bg-violet-100/80")}>
            <div className="flex items-center gap-3">
              <span className={cn("text-xs font-semibold", isDark ? "text-slate-400" : "text-violet-700")}>Rows per page:</span>
              <div className="relative">
                <select
                  value={perPage}
                  onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className={cn(
                    "appearance-none pl-3 pr-7 py-1.5 rounded-md text-xs font-bold border transition-all cursor-pointer focus:outline-none",
                    isDark ? "bg-[#161618] border-violet-500/20 text-white" : "bg-violet-50 border-violet-300 text-violet-950"
                  )}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-50" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className={cn("text-xs font-semibold", isDark ? "text-slate-400" : "text-violet-700")}>
                Page {currentPage} of {totalPages || 1} ({totalItems} total)
              </span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                  className={cn("p-1.5 rounded-md transition", isDark ? "hover:bg-white/10 disabled:opacity-30" : "hover:bg-slate-200 disabled:opacity-30")}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0 || loading}
                  className={cn("p-1.5 rounded-md transition", isDark ? "hover:bg-white/10 disabled:opacity-30" : "hover:bg-slate-200 disabled:opacity-30")}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </motion.div>
      </main>
    </div>
  )
}
