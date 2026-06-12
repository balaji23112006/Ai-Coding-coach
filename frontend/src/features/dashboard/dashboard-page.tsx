import React, { useState, useEffect, useRef, Suspense } from 'react'

// Third-party libraries
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, Float, Text } from '@react-three/drei'
import * as THREE from 'three'
import {
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  ChevronDown,
  Flame,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Map,
  MessageSquare,
  Moon,
  Paintbrush,
  Send,
  Sun,
  Target,
  Trophy,
  User,
  X,
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
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Internal imports
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { apiClient } from '@/services/api-client'
import { useAuth } from '@/features/authentication'

// --- Static Data ---
const zeroActivityData = Array.from({ length: 7 }).map((_, i) => ({ day: `Day ${i + 1}`, solved: 0 }))
const zeroMasteryData = [
  { topic: 'Arrays', mastery: 0 },
  { topic: 'Graphs', mastery: 0 },
  { topic: 'DP', mastery: 0 },
  { topic: 'Trees', mastery: 0 },
  { topic: 'Math', mastery: 0 },
]

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true, to: '/dashboard' as const },
  { label: 'Practice', icon: ListChecks, to: '/practice' as const },
  { label: 'Roadmap', icon: Map, to: '/roadmap' as const },
  { label: 'Progress', icon: Target, to: '/progress' as const },
  { label: 'Leaderboard', icon: Trophy },
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
  const { user, logout } = useAuth()
  const [isDark, setIsDark] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)

  useEffect(() => {
    apiClient.get<any>('/progress/summary')
      .then(res => {
        setDashboardData(res)
      })
      .catch(err => {
        console.error('Failed to fetch dashboard progress summary:', err)
      })
  }, [])

  const statsData = [
    { label: 'PROBLEMS SOLVED', value: dashboardData?.stats?.solved ?? '0', detail: `Out of ${dashboardData?.stats?.total ?? '0'} total`, icon: CheckCircle2 },
    { label: 'CURRENT STREAK', value: `${dashboardData?.stats?.currentStreak ?? '0'} Days`, detail: dashboardData?.stats?.currentStreak > 0 ? 'Keep it up!' : 'No rhythm yet', icon: Flame },
    { label: 'LONGEST STREAK', value: `${dashboardData?.stats?.longestStreak ?? '0'} Days`, detail: 'Top learner consistency', icon: Trophy },
    { label: 'MASTERY SCORE', value: `${dashboardData?.stats?.solved > 0 ? Math.round(((dashboardData?.stats?.solved || 0) / (dashboardData?.stats?.total || 1)) * 100) : 0}%`, detail: 'Overall program progress', icon: Target },
    { label: 'SUCCESS RATE', value: `${dashboardData?.stats?.successRate ?? '0'}%`, detail: `${dashboardData?.stats?.acceptedCount ?? '0'} / ${dashboardData?.stats?.totalAttempts ?? '0'} accepted`, icon: Trophy },
  ]

  const activityData = dashboardData?.activityData && dashboardData.activityData.length > 0
    ? dashboardData.activityData
    : zeroActivityData;

  const difficultyData = [
    { difficulty: 'Easy', solved: dashboardData?.stats?.easy ?? 0 },
    { difficulty: 'Medium', solved: dashboardData?.stats?.medium ?? 0 },
    { difficulty: 'Hard', solved: dashboardData?.stats?.hard ?? 0 },
  ];

  const masteryData = dashboardData?.skills && dashboardData.skills.length > 0
    ? dashboardData.skills.map((s: any) => ({ topic: s.topic, mastery: s.score }))
    : zeroMasteryData;

  // Gradient Backgrounds instead of flat black/white
  const themeClass = isDark 
    ? 'dark bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#171033] via-[#09090b] to-[#050505] text-slate-100' 
    : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-100 via-slate-50 to-white text-slate-900'
  
  const panelClass = isDark 
    ? 'rounded-2xl border border-white/[0.04] bg-[#121214]/80 backdrop-blur-md shadow-lg' 
    : 'rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-md shadow-xl'

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

      <TopNavigation isDark={isDark} setIsDark={setIsDark} user={user} logout={logout} />

      <motion.div 
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col"
      >
        {/* Hero is now Full-Width (w-full) and outside the restricted main container */}
        <Hero name={user?.fullName} />

        <main className="relative mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-12 sm:px-6 lg:px-8 z-10 -mt-16">
          <StatsGrid stats={statsData} panelClass={panelClass} isDark={isDark} />

          <motion.div variants={rowVariants} className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
            <ChartPanel title="Coding Activity" description="Problems solved across the last 30 days" badge="Last 30 days" panelClass={panelClass} isDark={isDark}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData} margin={{ top: 16, right: 12, left: -18, bottom: 4 }}>
                  <CartesianGrid stroke={isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)"} vertical={false} />
                  <XAxis axisLine={false} dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                  <YAxis axisLine={false} allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: isDark ? '#18181b' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e2e8f0', borderRadius: '8px', color: isDark ? '#e2e8f0' : '#0f172a' }} cursor={{ stroke: isDark ? '#27272a' : '#e2e8f0' }} />
                  <RechartsLine activeDot={{ fill: '#8b5cf6', r: 6, stroke: isDark ? '#09090b' : '#ffffff', strokeWidth: 3 }} dataKey="solved" dot={false} stroke="#8b5cf6" strokeWidth={2.5} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel title="Problems by Difficulty" description="Your challenge distribution" badge={`${dashboardData?.stats?.solved ?? 0} total`} panelClass={panelClass} isDark={isDark}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={difficultyData} margin={{ top: 16, right: 8, left: -20, bottom: 4 }}>
                  <CartesianGrid stroke={isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)"} vertical={false} />
                  <XAxis axisLine={false} dataKey="difficulty" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} />
                  <YAxis axisLine={false} allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: isDark ? '#18181b' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e2e8f0', borderRadius: '8px', color: isDark ? '#e2e8f0' : '#0f172a' }} cursor={{ fill: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }} />
                  <Bar dataKey="solved" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </motion.div>

          <motion.div variants={rowVariants} className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <ChartPanel title="Topic Mastery" description="Strength across core problem-solving domains" badge="Updated today" tall panelClass={panelClass} isDark={isDark}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={masteryData} outerRadius="72%">
                  <PolarGrid stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                  <PolarAngleAxis dataKey="topic" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: isDark ? '#18181b' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e2e8f0', borderRadius: '8px', color: isDark ? '#e2e8f0' : '#0f172a' }} />
                  <Radar dataKey="mastery" fill="#8b5cf6" fillOpacity={0.2} stroke="#8b5cf6" strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel title="Success Rate" description="Accepted submissions and passing test cases" badge={`${dashboardData?.stats?.successRate ?? 0}% overall`} tall panelClass={panelClass} isDark={isDark}>
              <div className="flex h-full flex-col">
                <div className="relative flex-1 min-h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart barSize={18} data={[{ name: 'Success', value: dashboardData?.stats?.successRate ?? 0, fill: '#8b5cf6' }]} endAngle={-270} innerRadius="72%" outerRadius="92%" startAngle={90}>
                      <RadialBar background={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' }} cornerRadius={14} dataKey="value" />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn("text-5xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{dashboardData?.stats?.successRate ?? 0}%</span>
                    <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-slate-500">Success rate</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 shrink-0">
                  <Metric label="Accepted" value={String(dashboardData?.stats?.acceptedCount ?? 0)} isDark={isDark} />
                  <Metric label="Total attempts" value={String(dashboardData?.stats?.totalAttempts ?? 0)} isDark={isDark} />
                </div>
              </div>
            </ChartPanel>
          </motion.div>

          <ConsistencyHeatmap heatmapData={dashboardData?.heatmapData} panelClass={panelClass} isDark={isDark} />

          <motion.div variants={rowVariants} className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <AiInsights panelClass={panelClass} isDark={isDark} />
            <WeakAreas panelClass={panelClass} isDark={isDark} />
          </motion.div>
        </main>
      </motion.div>

      <AiHelper isDark={isDark} />
    </div>
  )
}

function TopNavigation({ isDark, setIsDark, user, logout }: { isDark: boolean; setIsDark: (val: boolean) => void; user: any; logout: () => void }) {
  const [profileOpen, setProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl transition-all duration-500", 
        // Light mode gets a vibrant violet header, Dark mode stays dark and glassy
        isDark ? "border-white/[0.04] bg-[#09090b]/80" : "border-violet-700 bg-violet-600 shadow-xl"
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        
        <a className="flex shrink-0 items-center gap-3" href="/dashboard">
          <span className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg shadow-sm transition-transform hover:scale-105",
            isDark ? "bg-violet-600 text-white" : "bg-white text-violet-600"
          )}>
            <Map className="h-4 w-4" />
          </span>
          <span className="hidden text-lg font-bold tracking-tight text-white sm:block">
            Skill Lens
          </span>
        </a>

        <nav className={cn(
          "hidden items-center gap-1 rounded-full p-1 xl:flex shadow-sm border transition-colors", 
          isDark ? "bg-white/[0.02] border-white/[0.05]" : "bg-black/10 border-white/10"
        )}>
          {navItems.map((item) => {
            const className = cn(
                'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300',
                item.active
                  ? isDark ? 'bg-white/[0.08] text-white shadow-sm' : 'bg-white/20 text-white shadow-sm'
                  : cn(
                      'hover:-translate-y-0.5',
                      isDark 
                        ? 'text-slate-500 hover:text-violet-200 hover:bg-white/[0.04] hover:shadow-[0_0_12px_rgba(139,92,246,0.25)]' 
                        : 'text-violet-100 hover:text-white hover:bg-white/10 hover:shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                    )
              )
            const content = (
              <>
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
              </>
            )

            return item.to ? (
              <Link className={className} key={item.label} to={item.to}>
                {content}
              </Link>
            ) : (
              <button className={className} key={item.label} type="button">
                {content}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <IconButton label="Notifications" isDark={isDark} lightModeIconColor="text-violet-100">
            <Bell className="h-4 w-4" />
          </IconButton>
          <IconButton label="Toggle Theme" isDark={isDark} lightModeIconColor="text-violet-100" onClick={() => setIsDark(!isDark)}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </IconButton>
          
          <div className="relative ml-2" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className={cn("flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition", 
                isDark ? "border-white/[0.05] bg-[#161618] hover:bg-white/[0.05]" : "border-white/10 bg-black/10 hover:bg-black/20 text-white"
              )}
              type="button"
            >
              <span className={cn("flex h-7 w-7 items-center justify-center overflow-hidden rounded-full", isDark ? "bg-violet-600 text-white" : "bg-white text-violet-600")}>
                <User className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-bold hidden sm:inline max-w-[80px] truncate">{user?.fullName || 'User'}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-300", isDark ? "text-slate-400" : "text-violet-200", profileOpen && "rotate-180")} />
            </button>
            
            {profileOpen && (
              <div className={cn("absolute right-0 top-full mt-2 w-48 rounded-xl border p-1.5 shadow-xl origin-top-right animate-in fade-in zoom-in-95", 
                isDark ? "border-white/[0.05] bg-[#121214]" : "border-slate-200 bg-white"
              )}>
                <button className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition", isDark ? "text-slate-300 hover:bg-white/[0.04] hover:text-white" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900")}>
                  <User className="h-3.5 w-3.5" /> Account
                </button>
                <button className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition", isDark ? "text-slate-300 hover:bg-white/[0.04] hover:text-white" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900")}>
                  <Paintbrush className="h-3.5 w-3.5" /> Appearance
                </button>
                <div className={cn("my-1 h-px", isDark ? "bg-white/[0.04]" : "bg-slate-100")} />
                <button onClick={logout} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition", isDark ? "text-red-400 hover:bg-red-500/10 hover:text-red-300" : "text-red-600 hover:bg-red-50 hover:text-red-700")}>
                  <LogOut className="h-3.5 w-3.5" /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  )
}

function Hero({ name }: { name?: string }) {
  const sentence = "SKILL LENS"
  
  const textContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  }

  const letterVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  }

  const typewriterText = "Ready to level up today? Every problem solved brings you one step closer to mastering coding interviews."
  
  return (
    <motion.section 
      variants={blockVariants} 
      // Full Width, Edge-to-Edge Hero
      className="relative w-full flex flex-col items-center justify-center text-center min-h-[60vh] overflow-hidden pt-20 pb-24 shadow-2xl bg-gradient-to-b from-[#07050f]/75 via-[#07050f]/45 to-transparent"
    >

      <div className="relative max-w-5xl flex flex-col items-center z-10 px-4">
        <motion.h1 
          variants={textContainerVariants}
          initial="hidden"
          animate="visible"
          className="text-6xl sm:text-8xl md:text-[8rem] font-black tracking-tighter flex text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-violet-500/80 drop-shadow-2xl"
        >
          {sentence.split("").map((char, index) => (
            <motion.span key={index} variants={letterVariants}>
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="mt-8 text-2xl font-bold tracking-widest text-white uppercase drop-shadow-md"
        >
          Welcome back, {name || 'Coder'} !!
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="mt-6 text-2xl sm:text-3xl md:text-4xl max-w-4xl italic font-black text-slate-100 drop-shadow-lg leading-tight"
        >
          {typewriterText.split("").map((char, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6 + index * 0.02 }}
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

function StatsGrid({ stats, panelClass, isDark }: { stats: any[]; panelClass: string; isDark: boolean }) {
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
          <p className={cn("text-4xl font-bold tracking-tight mb-2", isDark ? "text-white" : "text-slate-900")}>{stat.value}</p>
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

function ConsistencyHeatmap({ heatmapData, panelClass, isDark }: { heatmapData?: any[]; panelClass: string; isDark: boolean }) {
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

  const data = heatmapData && heatmapData.length > 0 
    ? heatmapData 
    : Array.from({ length: 365 }).map((_, i) => ({ id: i, level: 0, title: `0 problems solved` }))

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
          {data.map((day) => (
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

function AiInsights({ panelClass, isDark }: { panelClass: string; isDark: boolean }) {
  const insights = [
    { text: 'You have not completed any problems yet. Start practicing!', badge: 'New Learner' },
  ]

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
            <p className={cn("text-sm font-medium", isDark ? "text-slate-300" : "text-slate-700")}>{insight.text}</p>
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
        <Button className="bg-violet-600 text-white hover:bg-violet-700 rounded-full text-xs h-8 font-semibold">
          Start learning
        </Button>
      </div>
    </motion.section>
  )
}

function WeakAreas({ panelClass, isDark }: { panelClass: string; isDark: boolean }) {
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
          <h2 className={cn("text-base font-semibold", isDark ? "text-white" : "text-slate-900")}>Areas to Improve</h2>
        </div>
      </div>

      <div className={cn("mt-6 flex h-32 items-center justify-center rounded-xl border border-dashed", isDark ? "border-white/[0.05] bg-[#161618]" : "border-slate-300 bg-slate-50")}>
        <p className={cn("text-sm font-medium text-center px-4", isDark ? "text-slate-500" : "text-slate-500")}>
          Solve more problems to generate your weak area analysis.
        </p>
      </div>
    </motion.section>
  )
}

function IconButton({ label, children, isDark, lightModeIconColor, onClick }: { label: string; children: React.ReactNode; isDark?: boolean; lightModeIconColor?: string; onClick?: () => void }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition",
        isDark 
          ? "bg-transparent text-slate-400 hover:bg-white/[0.05] hover:text-white" 
          : `bg-transparent ${lightModeIconColor || 'text-slate-500'} hover:bg-white/10 hover:text-white`
      )}
      type="button"
    >
      {children}
    </button>
  )
}

function AiHelper({ isDark }: { isDark: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<{role: 'bot' | 'user', text: string}[]>([
    { role: 'bot', text: 'Hi there! Need help navigating SKILL LENS?' }
  ])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userText = input.trim()
    setMessages(prev => [...prev, { role: 'user', text: userText }])
    setInput("")

    setTimeout(() => {
      const lower = userText.toLowerCase()
      let botReply = "I'm still learning! Try checking out the Roadmap or Practice section to get started."
      if (['hi', 'hello', 'hey'].includes(lower)) {
        botReply = "Hello! I can guide you through the dashboard. What would you like to practice today?"
      }
      setMessages(prev => [...prev, { role: 'bot', text: botReply }])
    }, 600)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={cn(
            "mb-4 w-72 sm:w-80 overflow-hidden rounded-2xl border shadow-2xl flex flex-col",
            isDark ? "bg-[#121214] border-white/[0.08]" : "bg-white border-slate-200"
          )}
        >
          <div className={cn("px-4 py-3 border-b flex justify-between items-center", isDark ? "bg-white/[0.02] border-white/[0.04]" : "bg-slate-50 border-slate-100")}>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white">
                <Bot className="h-3.5 w-3.5" />
              </span>
              <span className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>AI Guide</span>
            </div>
            <button onClick={() => setIsOpen(false)} className={cn("rounded-full p-1 transition", isDark ? "text-slate-400 hover:bg-white/[0.05] hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="h-64 p-4 overflow-y-auto flex flex-col gap-3">
            {messages.map((m, idx) => (
              <div key={idx} className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm font-medium", 
                m.role === 'user' 
                  ? "self-end bg-violet-600 text-white rounded-br-sm" 
                  : cn(isDark ? "self-start bg-white/[0.05] text-slate-200 rounded-bl-sm" : "self-start bg-slate-100 text-slate-800 rounded-bl-sm")
              )}>
                {m.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className={cn("p-3 border-t flex gap-2 items-center", isDark ? "border-white/[0.04]" : "border-slate-100")}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..." 
              className={cn("flex-1 text-sm bg-transparent outline-none px-2 font-medium", isDark ? "text-white placeholder:text-slate-600" : "text-slate-900 placeholder:text-slate-400")}
            />
            <button type="submit" disabled={!input.trim()} className="h-8 w-8 flex items-center justify-center rounded-full bg-violet-600 text-white disabled:opacity-50 transition">
              <Send className="h-3.5 w-3.5 ml-0.5" />
            </button>
          </form>
        </motion.div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] transition hover:scale-105 active:scale-95"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>
    </div>
  )
}
