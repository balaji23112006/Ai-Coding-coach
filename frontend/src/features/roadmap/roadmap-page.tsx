import { useState, useRef, Suspense, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Sphere, Text } from '@react-three/drei'
import * as THREE from 'three'
import {
  Bot,
  CheckCircle2,
  LayoutDashboard,
  ListChecks,
  Lock,
  Map as MapIcon,
  Moon,
  PlayCircle,
  Sun,
  Target,
  Trophy,
  User,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// --- Extended Data with Stats (All Zeroed) ---
export type NodeStatus = 'completed' | 'current' | 'locked'

export interface RoadmapNode {
  id: string
  title: string
  status: NodeStatus
  problems: string
  position: 'left' | 'right'
  stats: {
    completion: number
    accuracy: number
    timeSpent: string
  }
}

const roadmapNodes: RoadmapNode[] = [
  { id: 'basics', title: 'Programming Basics', status: 'current', problems: '0/15 Problems Solved', position: 'left', stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' } },
  { id: 'arrays', title: 'Arrays', status: 'locked', problems: '0/15 Problems Solved', position: 'right', stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' } },
  { id: 'strings', title: 'Strings', status: 'locked', problems: '0/12 Problems Solved', position: 'left', stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' } },
  { id: 'hashmaps', title: 'Hash Maps', status: 'locked', problems: '0/10 Problems Solved', position: 'right', stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' } },
  { id: 'linkedlists', title: 'Linked Lists', status: 'locked', problems: '0/12 Problems Solved', position: 'left', stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' } },
  { id: 'stack', title: 'Stack', status: 'locked', problems: '0/12 Problems Solved', position: 'right', stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' } },
  { id: 'binary-search', title: 'Binary Search', status: 'locked', problems: '0/12 Problems Solved', position: 'left', stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' } },
  { id: 'trees', title: 'Trees', status: 'locked', problems: '0/15 Problems Solved', position: 'right', stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' } },
  { id: 'graphs', title: 'Graphs', status: 'locked', problems: '0/20 Problems Solved', position: 'left', stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' } },
  { id: 'mixed-topics', title: 'Mixed Topics', status: 'locked', problems: '0/20 Problems Solved', position: 'right', stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' } },
  { id: 'dp', title: 'Dynamic Programming', status: 'locked', problems: '0/25 Problems Solved', position: 'left', stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' } },
]

const skillMastery = [
  { name: 'Basics', progress: 0 },
  { name: 'Arrays', progress: 0 },
  { name: 'Strings', progress: 0 },
  { name: 'Hash Maps', progress: 0 },
  { name: 'Linked Lists', progress: 0 },
  { name: 'Stack', progress: 0 },
  { name: 'Binary Search', progress: 0 },
  { name: 'Trees', progress: 0 },
  { name: 'Graphs', progress: 0 },
  { name: 'Mixed Topics', progress: 0 },
  { name: 'Dynamic Programming', progress: 0 },
]

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, active: false, to: '/dashboard' as const },
  { label: 'Practice', icon: ListChecks, active: false },
  { label: 'Roadmap', icon: MapIcon, active: true, to: '/roadmap' as const },
  { label: 'Progress', icon: Target, active: false, to: '/progress' as const },
  { label: 'Leaderboard', icon: Trophy, active: false },
]

const codeSymbols = ['{ }', '</>', '0101', '=>', '[]', '()', '&&', '||', '!=', '++', 'return', 'const']

// --- 3D Background with Coding Types & Mouse Parallax ---
function CodingRoadmap3D({ isDark }: { isDark: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const wireframeRef = useRef<THREE.Mesh>(null)

  // Track mouse movement to rotate the entire 3D scene (Parallax effect)
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    
    if (wireframeRef.current) {
      wireframeRef.current.rotation.x = t * 0.15
      wireframeRef.current.rotation.y = t * 0.2
    }

    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001
      // Interactive Mouse Parallax (Tilts based on cursor position)
      const targetX = (state.pointer.x * 0.2)
      const targetY = (state.pointer.y * 0.2)
      
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -targetY, 0.05)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetX, 0.05)
    }
  })

  // Memoize positions so they don't regenerate on every render
  const codeCloudConfig = useMemo(() => {
    return codeSymbols.map((symbol, i) => {
      const phi = Math.acos(-1 + (2 * i) / codeSymbols.length)
      const theta = Math.sqrt(codeSymbols.length * Math.PI) * phi
      const radius = 6 // Spread out wider for background

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
      {/* Central Tech Wireframe Sphere */}
      <Sphere ref={wireframeRef} args={[3, 16, 16]}>
        <meshBasicMaterial 
          color={isDark ? "#8b5cf6" : "#a78bfa"} 
          wireframe 
          transparent 
          opacity={isDark ? 0.15 : 0.3} 
        />
      </Sphere>

      {/* Floating Code Symbols */}
      {codeCloudConfig.map((config, i) => (
        <Float key={i} speed={config.speed} rotationIntensity={1.5} floatIntensity={2.5}>
          <Text
            position={[config.x, config.y, config.z]}
            fontSize={0.6}
            color={isDark ? "#c4b5fd" : "#8b5cf6"}
            anchorX="center"
            anchorY="middle"
            fillOpacity={isDark ? 0.4 : 0.7}
          >
            {config.symbol}
          </Text>
        </Float>
      ))}
    </group>
  )
}

// --- Main Page Component ---
export function RoadmapPage() {
  const [isDark, setIsDark] = useState(true)
  const [expandedNode, setExpandedNode] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Scroll Progress for the curved path
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })
  
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 50, damping: 15 })

  const themeClass = isDark 
    ? 'dark bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a103c] via-[#0d081e] to-[#070510] text-slate-100' 
    : 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-50 via-slate-50 to-slate-100 text-slate-900'

  const panelClass = isDark 
    ? 'rounded-2xl border border-white/[0.06] bg-[#120d20]/80 backdrop-blur-xl shadow-xl' 
    : 'rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xl'

  return (
    <div className={cn("min-h-screen overflow-x-hidden font-sans antialiased transition-all duration-500", themeClass)} ref={containerRef}>
      
      {/* 3D Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Suspense fallback={null}>
          <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
            <ambientLight intensity={isDark ? 0.6 : 1.2} />
            <CodingRoadmap3D isDark={isDark} />
          </Canvas>
        </Suspense>
      </div>

      {/* Top Navigation */}
      <header className={cn("fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl transition-all duration-500", isDark ? "border-white/[0.04] bg-[#09090b]/80" : "border-violet-600 bg-violet-400 shadow-md")}>
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3" to="/dashboard">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg shadow-sm transition-transform hover:scale-105", isDark ? "bg-violet-600 text-white" : "bg-black text-white")}>
              <MapIcon className="h-4 w-4" />
            </span>
            {/* Dark mode: White text. Light mode: Black text */}
            <span className={cn("text-lg font-bold tracking-tight", isDark ? "text-white" : "text-black")}>Skill Lens</span>
          </Link>
          
          <nav className={cn("hidden items-center gap-1 rounded-full p-1 xl:flex shadow-sm border transition-colors", isDark ? "bg-white/[0.02] border-white/[0.05]" : "bg-black/5 border-black/10")}>
            {navItems.map((item) => {
              const className = cn(
                  'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300',
                  item.active
                    ? isDark ? 'bg-white/[0.08] text-white' : 'bg-black/15 text-black shadow-sm'
                    : isDark 
                      ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]' 
                      : 'text-black/70 hover:text-black hover:bg-black/5'
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

          <div className="flex items-center gap-3">
            <button onClick={() => setIsDark(!isDark)} className={cn("p-2 rounded-full transition-colors", isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-black hover:bg-black/10")}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button className={cn("flex items-center justify-center h-8 w-8 rounded-full transition", isDark ? "bg-violet-600 text-white" : "bg-black text-white")}>
              <User className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-[1400px] px-4 pt-36 pb-32 sm:px-6 lg:px-8">
        
        {/* Animated Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="mb-16 text-center"
        >
          {/* UPDATED: YOUR ROADMAP (Capitalized) */}
          <h1 className={cn("text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b", isDark ? "from-white via-slate-200 to-violet-400" : "from-slate-900 via-slate-700 to-violet-600")}>
            YOUR ROADMAP
          </h1>
          <p className={cn("mt-6 text-lg font-medium max-w-2xl mx-auto", isDark ? "text-slate-400" : "text-slate-600")}>
            Track your progress, unlock new topics, and follow a structured, interactive path from beginner to advanced problem solving.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
          
          {/* Left Column: The Interactive Winding Roadmap */}
          <div className="relative py-10">
            
            {/* The Winding SVG Path */}
            <div className="absolute left-1/2 top-0 bottom-0 w-[200px] -translate-x-1/2 pointer-events-none z-0">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 200 1000">
                <path 
                  d="M100,0 C200,150 0,300 100,500 C200,700 0,850 100,1000" 
                  fill="none" 
                  strokeWidth="4" 
                  className={cn(isDark ? "stroke-white/[0.05]" : "stroke-slate-200")} 
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 200 1000">
                <motion.path 
                  d="M100,0 C200,150 0,300 100,500 C200,700 0,850 100,1000" 
                  fill="none" 
                  strokeWidth="6" 
                  className="stroke-violet-500" 
                  vectorEffect="non-scaling-stroke"
                  style={{ pathLength: smoothProgress }}
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="space-y-28 relative z-10">
              {roadmapNodes.map((node) => {
                const isLeft = node.position === 'left'
                const isLocked = node.status === 'locked'
                const isCurrent = node.status === 'current'
                const isExpanded = expandedNode === node.id

                return (
                  <motion.div 
                    key={node.id}
                    // UPDATED SCROLL ANIMATION: once: false ensures it fades in and out scrolling up AND down
                    initial={{ opacity: 0, y: 60, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: false, amount: 0.3, margin: "0px 0px -100px 0px" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={cn("flex items-center w-full relative", isLeft ? "justify-start md:pr-[55%]" : "justify-end md:pl-[55%] flex-row-reverse md:flex-row")}
                  >
                    {/* Interactive Node Card */}
                    <div 
                      onClick={() => setExpandedNode(isExpanded ? null : node.id)}
                      className={cn(
                        "w-full p-6 transition-all duration-500 cursor-pointer relative group",
                        panelClass,
                        "hover:scale-[1.02] hover:shadow-[0_15px_30px_rgba(139,92,246,0.2)]", // Always hoverable
                        isLocked && !isExpanded ? "opacity-80" : "opacity-100", 
                        isCurrent && (isDark ? "ring-2 ring-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)] bg-violet-500/10" : "ring-2 ring-violet-500 shadow-xl bg-violet-50"),
                        isExpanded && "ring-2 ring-cyan-400 z-20"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={cn("text-xl font-bold transition-colors", isDark ? "text-white group-hover:text-violet-300" : "text-slate-900 group-hover:text-violet-700")}>
                          {node.title}
                        </h3>
                        <div className={cn("flex items-center justify-center w-9 h-9 rounded-full transition-transform group-hover:scale-110", 
                          isLocked ? (isDark ? "bg-white/10 text-slate-400" : "bg-slate-200 text-slate-500") :
                          isCurrent ? "bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.6)]" : 
                          "bg-emerald-500 text-white"
                        )}>
                          {isLocked ? <Lock className="w-4 h-4" /> : 
                           isCurrent ? <PlayCircle className="w-4 h-4" /> : 
                           <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      </div>
                      
                      <p className={cn("text-sm font-semibold mb-4", isDark ? "text-slate-400" : "text-slate-500")}>
                        {isCurrent ? "In Progress" : isLocked ? "Requires Previous Module" : "Mastered"}
                      </p>

                      <div className="flex items-center gap-3">
                        <div className={cn("text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-md", isDark ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-700")}>
                          {node.problems}
                        </div>
                      </div>

                      {/* Expandable Stats Section */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            className="overflow-hidden"
                          >
                            <div className={cn("pt-4 border-t", isDark ? "border-white/10" : "border-slate-200")}>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", isDark ? "text-slate-500" : "text-slate-400")}>Completion</p>
                                  <p className={cn("text-lg font-black", isDark ? "text-cyan-400" : "text-violet-600")}>{node.stats.completion}%</p>
                                </div>
                                <div>
                                  <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", isDark ? "text-slate-500" : "text-slate-400")}>Accuracy</p>
                                  <p className={cn("text-lg font-black", isDark ? "text-emerald-400" : "text-emerald-600")}>{node.stats.accuracy}%</p>
                                </div>
                                <div>
                                  <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", isDark ? "text-slate-500" : "text-slate-400")}>Time</p>
                                  <p className={cn("text-lg font-black", isDark ? "text-white" : "text-slate-900")}>{node.stats.timeSpent}</p>
                                </div>
                              </div>
                              <Button className="w-full mt-6 bg-violet-600 hover:bg-violet-500 text-white font-bold">
                                {isLocked ? "View Prerequisites" : isCurrent ? "Continue Practice" : "Review Problems"}
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* The Center Node Dot */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full border-4 z-20 transition-transform hover:scale-125 cursor-pointer"
                         style={{ backgroundColor: isDark ? '#0d081e' : '#f8fafc', borderColor: isDark ? '#0d081e' : '#f8fafc' }}>
                      <div className={cn(
                        "w-full h-full rounded-full transition-colors duration-500",
                        isLocked ? (isDark ? "bg-slate-700" : "bg-slate-300") : "bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,1)]"
                      )} />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Right Column: Sticky Sidebar Stats */}
          <div className="space-y-6 md:sticky md:top-28 h-fit">
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ y: -6, scale: 1.015 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={cn(
                panelClass,
                "p-6 cursor-default transition-[border-color,background-color,box-shadow] duration-300",
                isDark
                  ? "hover:border-violet-500/50 hover:bg-violet-500/[0.08] hover:shadow-[0_18px_45px_rgba(139,92,246,0.2)]"
                  : "hover:border-violet-300 hover:bg-violet-50/90 hover:shadow-[0_18px_45px_rgba(109,40,217,0.15)]"
              )}
            >
              <h2 className={cn("text-xs font-black uppercase tracking-widest mb-6", isDark ? "text-slate-400" : "text-slate-500")}>Progress Overview</h2>
              <div className="flex items-baseline gap-2 mb-6">
                <span className={cn("text-6xl font-black", isDark ? "text-white" : "text-slate-900")}>0%</span>
                <span className={cn("text-sm font-bold uppercase", isDark ? "text-slate-500" : "text-slate-500")}>Overall</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className={isDark ? "text-slate-400 font-medium" : "text-slate-600 font-medium"}>Topics Completed</span>
                  <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>0 / {roadmapNodes.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={isDark ? "text-slate-400 font-medium" : "text-slate-600 font-medium"}>Problems Solved</span>
                  <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={isDark ? "text-slate-400 font-medium" : "text-slate-600 font-medium"}>Current Stage</span>
                  <span className="font-bold text-violet-500">Programming Basics</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ y: -6, scale: 1.015 }}
              transition={{ delay: 0.1, duration: 0.25, ease: "easeOut" }}
              className={cn(
                panelClass,
                "p-6 relative overflow-hidden cursor-default transition-[border-color,background-color,box-shadow] duration-300",
                isDark
                  ? "hover:border-cyan-400/50 hover:bg-cyan-500/[0.07] hover:shadow-[0_18px_45px_rgba(34,211,238,0.18)]"
                  : "hover:border-cyan-300 hover:bg-cyan-50/90 hover:shadow-[0_18px_45px_rgba(8,145,178,0.14)]"
              )}
            >
              <div className={cn("absolute top-0 right-0 w-40 h-40 rounded-full blur-[60px] -z-10", isDark ? "bg-cyan-500/20" : "bg-cyan-400/20")} />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
                  <Bot className="w-5 h-5" />
                </div>
                <h2 className={cn("text-xs font-black uppercase tracking-widest", isDark ? "text-cyan-400" : "text-blue-700")}>AI Coach Advice</h2>
              </div>
              <p className={cn("text-xl font-bold mb-3", isDark ? "text-white" : "text-slate-900")}>Start with the Basics.</p>
              <p className={cn("text-sm font-medium leading-relaxed mb-6", isDark ? "text-slate-400" : "text-slate-600")}>
                You are at the beginning of your journey. Solve foundational problems to start building your mastery score.
              </p>
              <Button className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black tracking-wide">
                View Recommended Problems
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ y: -6, scale: 1.015 }}
              transition={{ delay: 0.2, duration: 0.25, ease: "easeOut" }}
              className={cn(
                panelClass,
                "p-6 cursor-default transition-[border-color,background-color,box-shadow] duration-300",
                isDark
                  ? "hover:border-violet-500/50 hover:bg-violet-500/[0.08] hover:shadow-[0_18px_45px_rgba(139,92,246,0.2)]"
                  : "hover:border-violet-300 hover:bg-violet-50/90 hover:shadow-[0_18px_45px_rgba(109,40,217,0.15)]"
              )}
            >
              <h2 className={cn("text-xs font-black uppercase tracking-widest mb-6", isDark ? "text-slate-400" : "text-slate-500")}>Skill Mastery</h2>
              <div className="space-y-5">
                {skillMastery.map((skill) => (
                  <div key={skill.name}>
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className={isDark ? "text-slate-200" : "text-slate-800"}>{skill.name}</span>
                      <span className={isDark ? "text-slate-400" : "text-slate-500"}>{skill.progress}%</span>
                    </div>
                    <div className={cn("h-2 w-full rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-slate-200")}>
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${skill.progress}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </main>
    </div>
  )
}
