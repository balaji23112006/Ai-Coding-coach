import { useState, useEffect, useRef, Suspense, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Sphere, Text } from '@react-three/drei'
import * as THREE from 'three'
import {
  AlertTriangle,
  ArrowUpDown,
  Bot,
  History,
  Trophy,
  Zap,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
} from 'recharts'

import { cn } from '@/lib/utils'
import { TopNavigation } from '@/components/common/top-navigation'
import { AiHelper } from '@/components/common/ai-helper'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { topicPerformanceData, difficultyDistribution } from './data/progress-data'
import { AnimatedCounter } from '@/components/ui/animated-counter'


const pieChartConfig: ChartConfig = {
  value: {
    label: "Solved",
  },
}



// --- Animation Variants ---
const blockVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.8, ease: "easeOut" } 
  }
}

const codeSymbols = ['{ }', '</>', '0101', '=>', '[]', '()', '&&', '||', '!=', '++', 'return', 'const']

// --- 3D Background Component ---
function Analytics3DBackground({ isDark }: { isDark: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const wireframeRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()

    if (wireframeRef.current) {
      wireframeRef.current.rotation.x = t * 0.15
      wireframeRef.current.rotation.y = t * 0.2
    }

    if (groupRef.current) {
      const targetX = state.pointer.x * 0.2
      const targetY = state.pointer.y * 0.2
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -targetY, 0.05)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetX + t * 0.03, 0.05)
    }
  })

  const codeCloudConfig = useMemo(() => {
    return codeSymbols.map((symbol, i) => {
      const phi = Math.acos(-1 + (2 * i) / codeSymbols.length)
      const theta = Math.sqrt(codeSymbols.length * Math.PI) * phi
      const radius = 6

      return {
        symbol,
        x: radius * Math.cos(theta) * Math.sin(phi),
        y: radius * Math.sin(theta) * Math.sin(phi),
        z: radius * Math.cos(phi),
        speed: 1.5 + ((i * 7) % 10) / 10,
      }
    })
  }, [])

  return (
    <group ref={groupRef}>
      <Sphere ref={wireframeRef} args={[3, 16, 16]}>
        <meshBasicMaterial
          color={isDark ? "#8b5cf6" : "#a78bfa"}
          opacity={isDark ? 0.15 : 0.3}
          transparent
          wireframe
        />
      </Sphere>

      {codeCloudConfig.map((config) => (
        <Float key={config.symbol} speed={config.speed} rotationIntensity={1.5} floatIntensity={2.5}>
          <Text
            anchorX="center"
            anchorY="middle"
            color={isDark ? "#c4b5fd" : "#8b5cf6"}
            fillOpacity={isDark ? 0.4 : 0.7}
            fontSize={0.6}
            position={[config.x, config.y, config.z]}
          >
            {config.symbol}
          </Text>
        </Float>
      ))}
    </group>
  )
}

// --- Main Page Component ---
export function ProgressPage() {
  const [isDark, setIsDark] = useState(true)
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch('/api/progress/summary')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch summary')
        return res.json()
      })
      .then(json => {
        if (active && json.success) {
          setData(json)
        }
      })
      .catch(err => {
        console.error('Error fetching progress summary:', err)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [])

  const themeClass = isDark 
    ? 'dark bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a103c] via-[#0d081e] to-[#070510] text-slate-100' 
    : 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-50 via-slate-50 to-slate-100 text-slate-900'
  
  const panelClass = isDark 
    ? 'rounded-2xl border border-white/[0.06] bg-[#120d20]/80 backdrop-blur-xl shadow-xl' 
    : 'rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xl'

  const topicPerformance = data?.topicPerformance || topicPerformanceData

  // Handle empty state for Doughnut chart
  const renderDifficultyData = useMemo(() => {
    if (!data?.stats) return difficultyDistribution
    const total = (data.stats.easy ?? 0) + (data.stats.medium ?? 0) + (data.stats.hard ?? 0)
    if (total === 0) {
      return [{ name: 'No Data', value: 1, fillDark: '#334155', fillLight: '#e2e8f0' }]
    }
    return [
      { name: 'Easy', value: data.stats.easy ?? 0, fillDark: '#10b981', fillLight: '#059669' },
      { name: 'Medium', value: data.stats.medium ?? 0, fillDark: '#f59e0b', fillLight: '#d97706' },
      { name: 'Hard', value: data.stats.hard ?? 0, fillDark: '#ef4444', fillLight: '#dc2626' }
    ]
  }, [data])

  const totalSolved = useMemo(() => {
    if (!data?.stats) return 0
    return (data.stats.easy ?? 0) + (data.stats.medium ?? 0) + (data.stats.hard ?? 0)
  }, [data])

  const strongestTopics = useMemo(() => {
    if (!data?.topicPerformance) return []
    return data.topicPerformance
      .filter((t: any) => t.mastery >= 50 && t.solved > 0)
      .sort((a: any, b: any) => b.mastery - a.mastery || b.accuracy - a.accuracy)
      .slice(0, 3)
  }, [data])

  const needsImprovement = useMemo(() => {
    if (!data?.topicPerformance) return []
    return data.topicPerformance
      .filter((t: any) => t.mastery < 50)
      .sort((a: any, b: any) => a.mastery - b.mastery || a.accuracy - b.accuracy)
      .slice(0, 3)
  }, [data])

  if (isLoading) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center font-sans antialiased", themeClass)}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-sm font-bold tracking-wider text-violet-400">LOADING PROGRESS ANALYTICS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("min-h-screen overflow-x-hidden font-sans antialiased transition-all duration-500", themeClass)}>
      
      {/* 3D Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Suspense fallback={null}>
          <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
            <ambientLight intensity={isDark ? 0.6 : 1.2} />
            <Analytics3DBackground isDark={isDark} />
          </Canvas>
        </Suspense>
      </div>

      <TopNavigation isDark={isDark} setIsDark={setIsDark} activeTab="progress" />

      <main className="relative z-10 mx-auto w-full max-w-[1400px] space-y-8 px-4 pt-36 pb-32 sm:px-6 lg:px-8">
        
        {/* Animated Header */}
        <div className="mb-16 text-center flex flex-col items-center">
          <motion.h1 
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)', scale: 0.97 }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={cn("text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b", isDark ? "from-white via-slate-200 to-violet-400" : "from-slate-900 via-slate-700 to-violet-600")}
          >
            PROGRESS ANALYTICS
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1, delay: 0.55, ease: "easeOut" }}
            className={cn("mt-6 text-lg font-medium max-w-2xl", isDark ? "text-slate-400" : "text-slate-600")}
          >
            Track your growth, identify weak areas, and measure your coding journey.
          </motion.p>
        </div>

        {/* Section 1 & 2: Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          
          {/* Section 1: Topic Performance Analysis */}
          <motion.section 
            variants={blockVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            className={cn(panelClass, "p-6 flex flex-col hover:scale-[1.01] hover:shadow-[0_15px_30px_rgba(139,92,246,0.15)] transition-all duration-500")}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>Topic Performance Analysis</h2>
                <p className={cn("text-xs font-medium", isDark ? "text-slate-400" : "text-slate-500")}>Detailed breakdown of your accuracy and speed.</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={cn("border-b", isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500")}>
                    <th className="pb-3 font-semibold cursor-pointer group">Topic <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" /></th>
                    <th className="pb-3 font-semibold text-center cursor-pointer group">Problems Solved <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" /></th>
                    <th className="pb-3 font-semibold text-center cursor-pointer group">Accuracy (%) <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" /></th>
                    <th className="pb-3 font-semibold text-center cursor-pointer group">Avg Time <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" /></th>
                    <th className="pb-3 font-semibold text-right cursor-pointer group">Mastery Score <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" /></th>
                  </tr>
                </thead>
                <tbody className={cn(isDark ? "text-slate-300" : "text-slate-700")}>
                  {topicPerformance.map((topic: any, i: number) => (
                    <tr key={i} className={cn("border-b last:border-0 transition-colors", isDark ? "border-white/5 hover:bg-white/5" : "border-slate-100 hover:bg-slate-50")}>
                      <td className="py-4 font-bold">{topic.topic}</td>
                      <td className="py-4 text-center font-medium">{topic.solved}</td>
                      <td className="py-4 text-center font-medium">{topic.accuracy}%</td>
                      <td className="py-4 text-center font-medium">{topic.avgTime}</td>
                      <td className="py-4 text-right font-black text-violet-500">{topic.mastery}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* Section 2: Difficulty Distribution */}
          <motion.section 
            variants={blockVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            className={cn(panelClass, "p-6 flex flex-col hover:scale-[1.02] hover:shadow-[0_15px_30px_rgba(139,92,246,0.15)] transition-all duration-500")}
          >
            <h2 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>Difficulty Distribution</h2>
            <p className={cn("mt-1 text-xs font-medium mb-6", isDark ? "text-slate-400" : "text-slate-500")}>Problems solved by challenge level.</p>
            
            <div className="flex-1 relative min-h-[220px]">
              <ChartContainer config={pieChartConfig} className="h-full w-full max-h-[220px]">
                <PieChart>
                  <Pie
                    data={renderDifficultyData}
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={totalSolved === 0 ? 0 : 5}
                    dataKey="value"
                    stroke="none"
                  >
                    {renderDifficultyData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={isDark ? entry.fillDark : entry.fillLight} />
                    ))}
                  </Pie>
                  {totalSolved > 0 && <ChartTooltip content={<ChartTooltipContent />} />}
                </PieChart>
              </ChartContainer>
              {/* Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className={cn("text-4xl font-black", isDark ? "text-white" : "text-slate-900")}>
                  <AnimatedCounter value={totalSolved} />
                </span>
                <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-slate-500" : "text-slate-400")}>Total Solved</span>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="flex justify-center gap-5 mt-6">
              {difficultyDistribution.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: isDark ? d.fillDark : d.fillLight } as React.CSSProperties} />
                  <span className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-slate-300" : "text-slate-600")}>{d.name}</span>
                </div>
              ))}
            </div>
          </motion.section>
        </div>

        {/* Section 3: Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div 
            variants={blockVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            className={cn(panelClass, "p-6 relative overflow-hidden hover:scale-[1.02] hover:shadow-[0_15px_30px_rgba(16,185,129,0.15)] transition-all duration-500")}
          >
            <div className={cn("absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[60px] -z-10", isDark ? "bg-emerald-500/20" : "bg-emerald-400/20")} />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                <Trophy className="w-5 h-5" />
              </div>
              <h2 className={cn("text-sm font-black uppercase tracking-widest", isDark ? "text-emerald-400" : "text-emerald-600")}>Strongest Topics</h2>
            </div>
            {strongestTopics.length > 0 ? (
              <div className="space-y-3">
                {strongestTopics.map((topic: any, idx: number) => (
                  <div key={idx} className={cn("flex justify-between items-center p-3 rounded-lg border", isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-100")}>
                    <span className="font-bold text-sm">{topic.topic}</span>
                    <span className="text-emerald-500 font-extrabold text-xs">{topic.accuracy}% Accuracy</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={cn("flex flex-col items-center justify-center h-32 border border-dashed rounded-xl", isDark ? "border-white/10 bg-white/[0.01]" : "border-slate-300 bg-slate-50")}>
                <p className={cn("text-sm font-medium text-center px-4", isDark ? "text-slate-500" : "text-slate-500")}>
                  No data available yet. Start solving problems to generate insights.
                </p>
              </div>
            )}
          </motion.div>

          <motion.div 
            variants={blockVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            className={cn(panelClass, "p-6 relative overflow-hidden hover:scale-[1.02] hover:shadow-[0_15px_30px_rgba(244,63,94,0.15)] transition-all duration-500")}
          >
            <div className={cn("absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[60px] -z-10", isDark ? "bg-rose-500/20" : "bg-rose-400/20")} />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className={cn("text-sm font-black uppercase tracking-widest", isDark ? "text-rose-400" : "text-rose-600")}>Needs Improvement</h2>
            </div>
            {needsImprovement.length > 0 ? (
              <div className="space-y-3">
                {needsImprovement.map((topic: any, idx: number) => (
                  <div key={idx} className={cn("flex justify-between items-center p-3 rounded-lg border", isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-100")}>
                    <span className="font-bold text-sm">{topic.topic}</span>
                    <span className="text-rose-500 font-extrabold text-xs">{topic.mastery}% Mastered</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={cn("flex flex-col items-center justify-center h-32 border border-dashed rounded-xl", isDark ? "border-white/10 bg-white/[0.01]" : "border-slate-300 bg-slate-50")}>
                <p className={cn("text-sm font-medium text-center px-4", isDark ? "text-slate-500" : "text-slate-500")}>
                  No data available yet. Start solving problems to generate insights.
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Section 4 & 5: Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
          
          {/* Section 4: Learning Timeline */}
          <motion.section 
            variants={blockVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            className={cn(panelClass, "p-6 hover:scale-[1.01] hover:shadow-[0_15px_30px_rgba(139,92,246,0.15)] transition-all duration-500")}
          >
            <div className="flex items-center gap-3 mb-8">
              <History className={cn("w-6 h-6", isDark ? "text-violet-400" : "text-violet-600")} />
              <h2 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>Learning Timeline</h2>
            </div>
            
            <div className="relative border-l-2 ml-3 pl-8 py-2 min-h-[200px] border-dashed border-slate-500/30 space-y-6">
              {data?.milestones && data.milestones.length > 0 ? (
                data.milestones.map((m: any, idx: number) => (
                  <div key={idx} className="relative">
                    <div className={cn("absolute -left-[39px] top-1 w-4 h-4 rounded-full outline outline-4 outline-transparent ring-2", 
                      m.type === 'streak' 
                        ? "bg-amber-500 ring-amber-500/20" 
                        : "bg-violet-500 ring-violet-500/20"
                    )} />
                    <div className="flex flex-col">
                      <span className={cn("text-xs font-bold uppercase tracking-wider mb-0.5", isDark ? "text-slate-500" : "text-slate-400")}>
                        {m.date}
                      </span>
                      <span className={cn("text-sm font-black", isDark ? "text-white" : "text-slate-900")}>
                        {m.title}
                      </span>
                      <span className={cn("text-xs font-semibold leading-relaxed mt-1", isDark ? "text-slate-400" : "text-slate-600")}>
                        {m.description}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="relative">
                  <div className="absolute -left-[39px] top-1 w-4 h-4 rounded-full bg-slate-500/50 outline outline-4 outline-transparent ring-2 ring-slate-500/20" />
                  <p className={cn("text-sm font-medium leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
                    No activity recorded yet.<br/>Your milestones, streak achievements, and completed topics will appear here.
                  </p>
                </div>
              )}
            </div>
          </motion.section>

          {/* Section 5: AI Performance Insights */}
          <motion.section 
            variants={blockVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            className={cn(panelClass, "p-6 relative overflow-hidden flex flex-col hover:scale-[1.01] hover:shadow-[0_15px_30px_rgba(6,182,212,0.15)] transition-all duration-500")}
          >
            <div className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-[100px] -z-10", isDark ? "bg-cyan-500/15" : "bg-cyan-400/20")} />
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>AI Performance Insights</h2>
                <p className={cn("text-sm font-medium mt-1", isDark ? "text-slate-400" : "text-slate-500")}>Deep learning analysis of your coding patterns.</p>
              </div>
            </div>

            {data?.aiInsights && data.aiInsights.length > 0 ? (
              <div className="flex flex-col gap-4 w-full flex-1">
                {data.aiInsights.map((insight: any, idx: number) => (
                  <div key={idx} className={cn("flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between w-full", isDark ? "border-white/[0.04] bg-[#161618]" : "border-slate-100 bg-[#120d20]")}>
                    <p className={cn("text-sm font-medium", isDark ? "text-slate-300" : "text-slate-700")}>
                      {insight.text}
                    </p>
                    <span className={cn("w-fit shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider", isDark ? "bg-white/[0.04] text-slate-300" : "bg-slate-200 text-slate-700")}>
                      {insight.badge}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={cn("flex flex-col items-center justify-center flex-1 py-12 border border-dashed rounded-2xl w-full", isDark ? "border-white/10 bg-white/[0.01]" : "border-slate-300 bg-slate-50/50")}>
                <Zap className={cn("w-10 h-10 mb-4 opacity-40", isDark ? "text-cyan-400" : "text-cyan-600")} />
                <p className={cn("text-lg font-black text-center px-4", isDark ? "text-white" : "text-slate-900")}>
                  Not enough data available.
                </p>
                <p className={cn("text-sm font-medium text-center max-w-md px-4 mt-3 leading-relaxed", isDark ? "text-slate-400" : "text-slate-500")}>
                  Solve more problems to generate personalized AI insights regarding your speed, accuracy drops, and optimization suggestions.
                </p>
              </div>
            )}
          </motion.section>
        </div>


        <AiHelper isDark={isDark} />
      </main>
    </div>
  )
}


