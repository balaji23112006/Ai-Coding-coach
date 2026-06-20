import React, { useState, useEffect, useRef, Suspense } from 'react'

import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, Float, Text } from '@react-three/drei'
import * as THREE from 'three'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Flame,
  Target,
  Trophy,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line as RechartsLine,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

// Internal imports
import { cn } from '@/lib/utils'
import { TopNavigation } from '@/components/common/top-navigation'
import { AiHelper } from '@/components/common/ai-helper'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { useProfileAgent } from '@/hooks/useProfileAgent'

const activityChartConfig: ChartConfig = {
  solved: {
    label: "Solved",
    color: "#8b5cf6",
  },
}

const difficultyChartConfig: ChartConfig = {
  solved: {
    label: "Solved",
    color: "#8b5cf6",
  },
}

const masteryChartConfig: ChartConfig = {
  mastery: {
    label: "Mastery",
    color: "#8b5cf6",
  },
}

// --- Static Data ---
const zeroActivityData = Array.from({ length: 7 }).map((_, i) => ({ day: `Day ${i + 1}`, solved: 0 }))
const zeroMasteryData = [
  { topic: 'Arrays', mastery: 0 },
  { topic: 'Graphs', mastery: 0 },
  { topic: 'DP', mastery: 0 },
  { topic: 'Trees', mastery: 0 },
  { topic: 'Math', mastery: 0 },
]

// --- Master Animation Variants ---
const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.25,
      delayChildren: 0.1,
    }
  }
}

const rowVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    }
  }
}

const blockVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } 
  }
}

// --- 3D Background Component (Coding Types Theme) ---
function CodingEnvironment3D({ isDark }: { isDark: boolean }) {
  const wireframeRef = useRef<THREE.Mesh>(null)
  const codeCloudRef = useRef<THREE.Group>(null)
  
  const codeSymbols = ['{ }', '</>', '0101', '=>', '[]', '()', '&&', '||', '!=', '++', 'return', 'const']

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (wireframeRef.current) {
      wireframeRef.current.rotation.x = t * 0.15
      wireframeRef.current.rotation.y = t * 0.2
    }
    if (codeCloudRef.current) {
      codeCloudRef.current.rotation.y = t * 0.08
      codeCloudRef.current.rotation.z = Math.sin(t * 0.1) * 0.05
    }
  })

  return (
    <group>
      {/* Central Tech Wireframe Sphere */}
      <Sphere ref={wireframeRef} args={[2.2, 16, 16]}>
        <meshBasicMaterial 
          color={isDark ? "#8b5cf6" : "#7c3aed"} 
          wireframe 
          transparent 
          opacity={isDark ? 0.22 : 0.28} 
        />
      </Sphere>

      {/* Orbiting Code Cloud */}
      <group ref={codeCloudRef}>
        {codeSymbols.map((symbol, i) => {
          const phi = Math.acos(-1 + (2 * i) / codeSymbols.length)
          const theta = Math.sqrt(codeSymbols.length * Math.PI) * phi
          const radius = 6

          const x = radius * Math.cos(theta) * Math.sin(phi)
          const y = radius * Math.sin(theta) * Math.sin(phi)
          const z = radius * Math.cos(phi)

          return (
            <Float
              key={symbol}
              speed={2 + ((i * 7) % 10) / 10}
              rotationIntensity={1}
              floatIntensity={2}
            >
              <Text
                position={[x, y, z]}
                fontSize={0.4}
                color={isDark ? "#c4b5fd" : "#7c3aed"}
                anchorX="center"
                anchorY="middle"
                fillOpacity={isDark ? 0.55 : 0.65}
              >
                {symbol}
              </Text>
            </Float>
          )
        })}
      </group>
    </group>
  )
}

// --- Main Page Component ---
export function DashboardPage() {
  const [isDark, setIsDark] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const { profile, aiSummary, trendExplanation } = useProfileAgent()

  useEffect(() => {
    let active = true
    fetch('/api/progress/summary')
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized or failed to load')
        return res.json()
      })
      .then(data => {
        if (active) {
          setDashboardData(data)
        }
      })
      .catch(err => {
        console.warn('Could not load dashboard stats from backend, using default mock data.', err)
      })
    return () => {
      active = false
    }
  }, [])

  // Gradient Backgrounds instead of flat black/white
  const themeClass = isDark 
    ? 'dark bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#171033] via-[#09090b] to-[#050505] text-slate-100' 
    : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-100 via-slate-50 to-white text-slate-900'
  
  const panelClass = isDark 
    ? 'rounded-2xl border border-white/[0.04] bg-[#121214]/80 backdrop-blur-md shadow-lg' 
    : 'rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-md shadow-xl'

  const activityData = dashboardData?.activityData?.map((d: any) => ({
    day: d.day.split('-').slice(1).join('/'),
    solved: d.solved
  })) || zeroActivityData

  const difficultyData = [
    { difficulty: 'Easy', solved: dashboardData?.stats?.easy ?? 0 },
    { difficulty: 'Medium', solved: dashboardData?.stats?.medium ?? 0 },
    { difficulty: 'Hard', solved: dashboardData?.stats?.hard ?? 0 },
  ]

  const masteryData = (profile?.skills && Object.keys(profile.skills).length > 0)
    ? Object.entries(profile.skills).map(([topic, score]) => ({
        topic,
        mastery: score,
      }))
    : (dashboardData?.skills?.map((s: any) => ({
        topic: s.topic,
        mastery: s.score
      })) || zeroMasteryData)

  const successRate = dashboardData?.stats?.successRate ?? 0

  return (
    <div className={cn("relative min-h-screen overflow-x-hidden font-sans antialiased transition-all duration-500", themeClass)}>
      <div className="pointer-events-none fixed inset-0 z-0 opacity-80">
        <Suspense fallback={null}>
          <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
            <ambientLight intensity={isDark ? 0.5 : 1} />
            <pointLight position={[10, 10, 10]} intensity={1.4} />
            <CodingEnvironment3D isDark={isDark} />
          </Canvas>
        </Suspense>
      </div>

      <TopNavigation isDark={isDark} setIsDark={setIsDark} activeTab="dashboard" />

      <motion.div 
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col"
      >
        {/* Hero is now Full-Width (w-full) and outside the restricted main container */}
        <Hero />

        <main className="relative mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-12 sm:px-6 lg:px-8 z-10 -mt-16">
          <StatsGrid panelClass={panelClass} isDark={isDark} data={dashboardData} profile={profile} />

          <motion.div variants={rowVariants} className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
            <ChartPanel title="Coding Activity" description="Problems solved across the last 30 days" badge="Last 30 days" panelClass={panelClass} isDark={isDark}>
              <ChartContainer config={activityChartConfig} className="h-[240px] w-full">
                <LineChart data={activityData} margin={{ top: 16, right: 12, left: -18, bottom: 4 }}>
                  <CartesianGrid stroke={isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)"} vertical={false} />
                  <XAxis axisLine={false} dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                  <YAxis axisLine={false} allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <RechartsLine activeDot={{ fill: '#8b5cf6', r: 6, stroke: isDark ? '#09090b' : '#ffffff', strokeWidth: 3 }} dataKey="solved" dot={false} stroke="#8b5cf6" strokeWidth={2.5} type="monotone" />
                </LineChart>
              </ChartContainer>
            </ChartPanel>

            <ChartPanel title="Problems by Difficulty" description="Your challenge distribution" badge={`${dashboardData?.stats?.solved ?? 0} total`} panelClass={panelClass} isDark={isDark}>
              <ChartContainer config={difficultyChartConfig} className="h-[240px] w-full">
                <BarChart data={difficultyData} margin={{ top: 16, right: 8, left: -20, bottom: 4 }}>
                  <CartesianGrid stroke={isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)"} vertical={false} />
                  <XAxis axisLine={false} dataKey="difficulty" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} />
                  <YAxis axisLine={false} allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="solved" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
                </BarChart>
              </ChartContainer>
            </ChartPanel>
          </motion.div>

          <motion.div variants={rowVariants} className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <ChartPanel title="Topic Mastery" description="Strength across core problem-solving domains" badge="Updated today" tall panelClass={panelClass} isDark={isDark}>
              <ChartContainer config={masteryChartConfig} className="h-[300px] w-full">
                <RadarChart data={masteryData} outerRadius="72%">
                  <PolarGrid stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                  <PolarAngleAxis dataKey="topic" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Radar dataKey="mastery" fill="#8b5cf6" fillOpacity={0.2} stroke="#8b5cf6" strokeWidth={2} />
                </RadarChart>
              </ChartContainer>
            </ChartPanel>

            <ChartPanel title="Success Rate" description="Accepted submissions and passing test cases" badge={`${successRate}% this month`} tall panelClass={panelClass} isDark={isDark}>
              <div className="flex h-full flex-col">
                <div className="relative flex-1 min-h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart barSize={18} data={[{ name: 'Success', value: successRate, fill: '#8b5cf6' }]} endAngle={-270} innerRadius="72%" outerRadius="92%" startAngle={90}>
                      <RadialBar background={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' }} cornerRadius={14} dataKey="value" />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn("text-5xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                      <AnimatedCounter value={successRate} suffix="%" />
                    </span>
                    <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-slate-500">Success rate</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 shrink-0">
                  <Metric label="Accepted" value={String(dashboardData?.stats?.acceptedCount ?? 0)} isDark={isDark} />
                  <Metric label="Total Attempts" value={String(dashboardData?.stats?.totalAttempts ?? 0)} isDark={isDark} />
                </div>
              </div>
            </ChartPanel>
          </motion.div>

          <ConsistencyHeatmap panelClass={panelClass} isDark={isDark} data={dashboardData?.heatmapData} />

          <motion.div variants={rowVariants} className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <AiInsights panelClass={panelClass} isDark={isDark} data={dashboardData} aiSummary={aiSummary} trendExplanation={trendExplanation} />
            <WeakAreas panelClass={panelClass} isDark={isDark} data={dashboardData} profile={profile} />
          </motion.div>
        </main>
      </motion.div>

      <AiHelper isDark={isDark} />
    </div>
  )
}



function Hero() {
  const typewriterText = "Ready to level up today? Every problem solved brings you one step closer to mastering coding interviews."
  
  return (
    <motion.section 
      variants={blockVariants} 
      // Full Width, Edge-to-Edge Hero
      className="relative w-full flex flex-col items-center justify-center text-center min-h-[60vh] overflow-hidden pt-20 pb-24 shadow-2xl bg-gradient-to-b from-[#07050f]/75 via-[#07050f]/45 to-transparent"
    >

      <div className="relative max-w-5xl flex flex-col items-center z-10 px-4">
        <motion.h1 
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)', scale: 0.97 }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
          transition={{ duration: 1.8, ease: 'easeOut' }}
          className="text-6xl sm:text-8xl md:text-[8rem] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-violet-500/80 drop-shadow-2xl"
        >
          SKILL LENS
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.1, duration: 0.9, ease: 'easeOut' }}
          className="mt-8 text-2xl font-bold tracking-widest text-white uppercase drop-shadow-md"
        >
          Welcome back !!
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7, duration: 0.8 }}
          className="mt-6 text-2xl sm:text-3xl md:text-4xl max-w-4xl italic font-black text-slate-100 drop-shadow-lg leading-tight"
        >
          {typewriterText.split("").map((char, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.7 + index * 0.025 }}
              className="italic font-black"
            >
              {char}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </motion.section>
  )
}

import { AnimatedCounter } from '@/components/ui/animated-counter'

function StatsGrid({ panelClass, isDark, data, profile }: { panelClass: string; isDark: boolean; data: any; profile: any }) {
  const solved = data?.stats?.solved ?? 0
  const currentStreak = data?.stats?.currentStreak ?? 0
  const longestStreak = data?.stats?.longestStreak ?? 0
  const successRate = data?.stats?.successRate ?? 0
  const skillLevel = profile?.experienceLevel || 'Beginner'

  const stats = [
    { label: 'PROBLEMS SOLVED', value: solved, suffix: '', detail: `Total solved problems`, icon: CheckCircle2 },
    { label: 'CURRENT STREAK', value: currentStreak, suffix: ' Days', detail: currentStreak > 0 ? 'Keep it up!' : 'Start your streak today', icon: Flame },
    { label: 'LONGEST STREAK', value: longestStreak, suffix: ' Days', detail: `Your personal best`, icon: Trophy },
    { label: 'SKILL LEVEL', value: skillLevel, suffix: '', detail: 'AI Assessed Level', icon: Bot },
    { label: 'MASTERY SCORE', value: successRate, suffix: '%', detail: `Submissions acceptance rate`, icon: Target },
  ]

  return (
    <motion.section 
      variants={rowVariants}
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
    >
      {stats.map((stat) => (
        <motion.article
          variants={blockVariants}
          key={stat.label}
          className={cn(
            panelClass, 
            'p-6 transition-all duration-300 cursor-default flex flex-col justify-between',
            isDark 
              ? 'hover:border-violet-500/50 hover:bg-[#161618] hover:-translate-y-1.5 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]' 
              : 'hover:border-violet-400 hover:bg-white hover:-translate-y-1.5 hover:shadow-[0_15px_30px_rgba(139,92,246,0.15)]'
          )}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-full transition-colors", isDark ? "bg-white/[0.05]" : "bg-violet-100")}>
              <stat.icon className={cn('h-4 w-4', isDark ? "text-violet-400" : "text-violet-600")} />
            </div>
            <p className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-slate-300" : "text-slate-600")}>{stat.label}</p>
          </div>
          <p className={cn("text-4xl font-bold tracking-tight mb-2", isDark ? "text-white" : "text-slate-900")}>
            {typeof stat.value === 'number' ? (
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
            ) : (
              stat.value
            )}
          </p>
          <p className={cn("text-sm font-medium", isDark ? "text-slate-500" : "text-slate-500")}>{stat.detail}</p>
        </motion.article>
      ))}
    </motion.section>
  )
}


type ChartPanelProps = {
  title: string
  description: string
  badge: string
  tall?: boolean
  panelClass: string
  isDark: boolean
  children: React.ReactNode
}

function ChartPanel({
  title,
  description,
  badge,
  tall = false,
  panelClass,
  isDark,
  children,
}: ChartPanelProps) {
  return (
    <motion.section 
      variants={blockVariants}
      className={cn(panelClass, 'p-6 flex flex-col')}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className={cn("text-base font-semibold", isDark ? "text-white" : "text-slate-900")}>{title}</h2>
          <p className={cn("mt-1 text-xs font-medium", isDark ? "text-slate-500" : "text-slate-500")}>{description}</p>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-[10px] font-semibold',
            isDark ? 'bg-white/[0.03] text-slate-400' : 'bg-slate-100 text-slate-600',
          )}
        >
          {badge}
        </span>
      </div>
      <div className={cn("flex-1", tall ? 'min-h-[300px]' : 'min-h-[240px]')}>{children}</div>
    </motion.section>
  )
}

function Metric({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <div className={cn("rounded-xl border p-3 text-center transition-colors", isDark ? "border-white/[0.04] bg-[#161618] hover:bg-white/[0.04]" : "border-slate-100 bg-slate-50 hover:bg-slate-100")}>
      <p className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>{value}</p>
      <p className={cn("mt-1 text-[10px] font-semibold uppercase tracking-wider leading-tight", isDark ? "text-slate-500" : "text-slate-500")}>{label}</p>
    </div>
  )
}

function ConsistencyHeatmap({ panelClass, isDark, data }: { panelClass: string; isDark: boolean; data?: any[] }) {
  const levelClasses = isDark ? [
    'bg-white/[0.03]',
    'bg-violet-950/40',
    'bg-violet-900/60',
    'bg-violet-600',
    'bg-violet-400',
  ] : [
    'bg-slate-100',
    'bg-violet-200',
    'bg-violet-300',
    'bg-violet-500',
    'bg-violet-700',
  ]

  const dummyHeatmapData = Array.from({ length: 365 }).map((_, i) => ({ id: i, level: 0, title: `0 problems solved` }))
  const heatmapData = data || dummyHeatmapData

  return (
    <motion.section 
      variants={blockVariants}
      className={cn(panelClass, 'p-6')}
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className={cn("text-base font-semibold", isDark ? "text-white" : "text-slate-900")}>Coding Consistency</h2>
          <p className={cn("mt-1 text-xs font-medium", isDark ? "text-slate-400" : "text-slate-500")}>
            Each square represents a day. Solve more problems to deepen the color.
          </p>
        </div>
        <div className={cn("flex items-center gap-2 text-xs font-medium", isDark ? "text-slate-500" : "text-slate-500")}>
          Less
          <div className="flex gap-1">
            {levelClasses.map((className) => (
              <span className={cn('h-3 w-3 rounded-sm', className)} key={className} />
            ))}
          </div>
          More
        </div>
      </div>

      <div className="mt-6 overflow-x-auto pb-2">
        <div className="grid min-w-[760px] grid-flow-col grid-rows-7 gap-1">
          {heatmapData.map((day) => (
            <div
              className={cn('h-3 w-3 rounded-sm transition', isDark ? 'hover:ring-1 hover:ring-white/30' : 'hover:ring-1 hover:ring-slate-400', levelClasses[day.level])}
              key={day.id}
              title={day.title}
            />
          ))}
        </div>
      </div>
    </motion.section>
  )
}

function AiInsights({
  panelClass,
  isDark,
  data,
  aiSummary,
  trendExplanation,
}: {
  panelClass: string
  isDark: boolean
  data: any
  aiSummary: string
  trendExplanation: string
}) {
  const solvedCount = data?.stats?.solved ?? 0
  const insights: Array<{ text: string; badge: string }> = []

  if (aiSummary) {
    insights.push({ text: aiSummary, badge: 'Profile Summary' })
  }
  if (trendExplanation) {
    insights.push({ text: trendExplanation, badge: 'Activity Trend' })
  }

  if (insights.length === 0) {
    insights.push(
      solvedCount > 0
        ? {
            text: `Great job! You have solved ${solvedCount} problems so far. Keep pushing to master more topics!`,
            badge: 'Progressing',
          }
        : { text: 'You have not completed any problems yet. Start practicing!', badge: 'New Learner' }
    )
  }

  return (
    <motion.section 
      variants={blockVariants}
      className={cn(panelClass, 'p-6')}
    >
      <div className="flex items-center gap-3">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", isDark ? "bg-violet-500/10 text-violet-400" : "bg-violet-100 text-violet-700")}>
          <Bot className="h-4 w-4" />
        </span>
        <div>
          <h2 className={cn("text-base font-semibold", isDark ? "text-white" : "text-slate-900")}>AI Insights</h2>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {insights.map((insight) => (
          <div className={cn("flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between", isDark ? "border-white/[0.04] bg-[#161618]" : "border-slate-100 bg-slate-50")} key={insight.text}>
            <p className={cn("text-sm font-medium leading-relaxed", isDark ? "text-slate-300" : "text-slate-700")}>{insight.text}</p>
            <span className={cn("w-fit shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider", isDark ? "bg-white/[0.04] text-slate-300" : "bg-slate-200 text-slate-700")}>
              {insight.badge}
            </span>
          </div>
        ))}
      </div>

      <div className={cn("mt-5 flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between", isDark ? "border-violet-500/20 bg-violet-500/5" : "border-violet-200 bg-violet-50")}>
        <div>
          <p className={cn("text-xs font-bold uppercase tracking-wider mb-1", isDark ? "text-violet-400" : "text-violet-700")}>Recommended first topic</p>
          <p className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>Arrays & Hashing</p>
        </div>
        <Link to="/practice" className="inline-flex items-center justify-center rounded-full bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-700">
          Start learning
        </Link>
      </div>
    </motion.section>
  )
}

function WeakAreas({ panelClass, isDark, data, profile }: { panelClass: string; isDark: boolean; data: any; profile: any }) {
  const solvedCount = data?.stats?.solved ?? 0
  const skillsMap = profile?.skills || {}
  const skillsArray = Object.entries(skillsMap).map(([topic, score]) => ({
    topic,
    score: score as number,
  }))

  const strongAreas = skillsArray.filter((s) => s.score >= 70).sort((a, b) => b.score - a.score)
  const weakAreas = skillsArray.filter((s) => s.score < 70 && s.score > 0).sort((a, b) => a.score - b.score)

  return (
    <motion.section 
      variants={blockVariants}
      className={cn(panelClass, 'p-6')}
    >
      <div className="flex items-center gap-3">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", isDark ? "bg-white/[0.03] text-slate-400" : "bg-slate-100 text-slate-500")}>
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div>
          <h2 className={cn("text-base font-semibold", isDark ? "text-white" : "text-slate-900")}>AI Skill Analysis</h2>
        </div>
      </div>

      {solvedCount > 0 && skillsArray.length > 0 ? (
        <div className="mt-6 space-y-4">
          {strongAreas.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-green-500 mb-2">Strong Areas</h3>
              <div className="flex flex-wrap gap-2">
                {strongAreas.map((s) => (
                  <span key={s.topic} className={cn("px-2.5 py-1 rounded-full text-xs font-semibold", isDark ? "bg-green-500/10 text-green-400" : "bg-green-100 text-green-700")}>
                    {s.topic} ({s.score}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {weakAreas.length > 0 && (
            <div className="pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-2">Areas to Improve</h3>
              <div className="flex flex-wrap gap-2">
                {weakAreas.map((s) => (
                  <span key={s.topic} className={cn("px-2.5 py-1 rounded-full text-xs font-semibold", isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-100 text-amber-700")}>
                    {s.topic} ({s.score}%)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={cn("mt-6 flex h-32 items-center justify-center rounded-xl border border-dashed", isDark ? "border-white/[0.05] bg-[#161618]" : "border-slate-300 bg-slate-50")}>
          <p className={cn("text-sm font-medium text-center px-4", isDark ? "text-slate-500" : "text-slate-500")}>
            Solve more problems to generate your AI skill analysis.
          </p>
        </div>
      )}
    </motion.section>
  )
}


