import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { motion, useSpring, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Bot, CheckCircle2, Lock, PlayCircle, Loader2, RefreshCw, Target, Activity } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TopNavigation } from '@/components/common/top-navigation';
import { useAuth } from '@/features/authentication/hooks/use-auth';
import { AiRoadmapPanel } from './components/ai-roadmap-panel';

// --- Extended Data with Stats (All Zeroed) ---
export type NodeStatus = 'completed' | 'in-progress' | 'current' | 'locked';

export const mapNodeIdToTopic = (id: string): string => {
  const map: Record<string, string> = {
    basics: 'All',
    arrays: 'Arrays',
    strings: 'Strings',
    hashmaps: 'HashMap',
    linkedlists: 'Linked List',
    stack: 'Stack',
    'binary-search': 'Binary Search',
    trees: 'Trees',
    graphs: 'Graphs',
  };
  return map[id] || 'All';
};

export interface RoadmapNode {
  id: string;
  title: string;
  status: NodeStatus;
  problems: string;
  position: 'left' | 'right';
  stats: {
    completion: number;
    accuracy: number;
    timeSpent: string;
  };
}

const roadmapNodes: RoadmapNode[] = [
  {
    id: 'basics',
    title: 'Programming Basics',
    status: 'current',
    problems: '0/15 Problems Solved',
    position: 'left',
    stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' },
  },
  {
    id: 'arrays',
    title: 'Arrays',
    status: 'locked',
    problems: '0/15 Problems Solved',
    position: 'right',
    stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' },
  },
  {
    id: 'strings',
    title: 'Strings',
    status: 'locked',
    problems: '0/12 Problems Solved',
    position: 'left',
    stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' },
  },
  {
    id: 'hashmaps',
    title: 'Hash Maps',
    status: 'locked',
    problems: '0/10 Problems Solved',
    position: 'right',
    stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' },
  },
  {
    id: 'linkedlists',
    title: 'Linked Lists',
    status: 'locked',
    problems: '0/12 Problems Solved',
    position: 'left',
    stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' },
  },
  {
    id: 'stack',
    title: 'Stack',
    status: 'locked',
    problems: '0/12 Problems Solved',
    position: 'right',
    stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' },
  },
  {
    id: 'binary-search',
    title: 'Binary Search',
    status: 'locked',
    problems: '0/12 Problems Solved',
    position: 'left',
    stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' },
  },
  {
    id: 'trees',
    title: 'Trees',
    status: 'locked',
    problems: '0/15 Problems Solved',
    position: 'right',
    stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' },
  },
  {
    id: 'graphs',
    title: 'Graphs',
    status: 'locked',
    problems: '0/20 Problems Solved',
    position: 'left',
    stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' },
  },
  {
    id: 'mixed-topics',
    title: 'Mixed Topics',
    status: 'locked',
    problems: '0/20 Problems Solved',
    position: 'right',
    stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' },
  },
  {
    id: 'dp',
    title: 'Dynamic Programming',
    status: 'locked',
    problems: '0/25 Problems Solved',
    position: 'left',
    stats: { completion: 0, accuracy: 0, timeSpent: '0h 0m' },
  },
];

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
];

const codeSymbols = [
  '{ }',
  '</>',
  '0101',
  '=>',
  '[]',
  '()',
  '&&',
  '||',
  '!=',
  '++',
  'return',
  'const',
];

// --- 3D Background with Coding Types & Mouse Parallax ---
function CodingRoadmap3D({ isDark }: { isDark: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const wireframeRef = useRef<THREE.Mesh>(null);

  // Track mouse movement to rotate the entire 3D scene (Parallax effect)
  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (wireframeRef.current) {
      wireframeRef.current.rotation.x = t * 0.15;
      wireframeRef.current.rotation.y = t * 0.2;
    }

    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
      // Interactive Mouse Parallax (Tilts based on cursor position)
      const targetX = state.pointer.x * 0.2;
      const targetY = state.pointer.y * 0.2;

      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        -targetY,
        0.05,
      );
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetX,
        0.05,
      );
    }
  });

  // Memoize positions so they don't regenerate on every render
  const codeCloudConfig = useMemo(() => {
    return codeSymbols.map((symbol, i) => {
      const phi = Math.acos(-1 + (2 * i) / codeSymbols.length);
      const theta = Math.sqrt(codeSymbols.length * Math.PI) * phi;
      const radius = 6; // Spread out wider for background

      return {
        symbol,
        x: radius * Math.cos(theta) * Math.sin(phi),
        y: radius * Math.sin(theta) * Math.sin(phi),
        z: radius * Math.cos(phi),
        speed: 1.5 + ((i * 7) % 10) / 10,
      };
    });
  }, []);

  return (
    <group ref={groupRef}>
      {/* Central Tech Wireframe Sphere */}
      <Sphere ref={wireframeRef} args={[3, 16, 16]}>
        <meshBasicMaterial
          color={isDark ? '#8b5cf6' : '#a78bfa'}
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
            color={isDark ? '#c4b5fd' : '#8b5cf6'}
            anchorX="center"
            anchorY="middle"
            fillOpacity={isDark ? 0.4 : 0.7}
          >
            {config.symbol}
          </Text>
        </Float>
      ))}
    </group>
  );
}

// --- Main Page Component ---
export function RoadmapPage() {
  const { user } = useAuth();
  
  const [isDark, setIsDark] = useState(true);
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Recommendations state
  const [recData, setRecData] = useState<any[] | null>(null);
  const [recExplanation, setRecExplanation] = useState('');
  const [isRecLoading, setIsRecLoading] = useState(false);
  const [recError, setRecError] = useState('');
  const [isUpdatingRec, setIsUpdatingRec] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [recTimestamp, setRecTimestamp] = useState<number | null>(null);
  const [showRecSection, setShowRecSection] = useState(false);

  // Polling logic for recommendations
  useEffect(() => {
    let timeoutId: number;
    if (isUpdatingRec && pollCount < 10) {
      timeoutId = window.setTimeout(async () => {
        try {
          const res = await fetch('/api/ai/problem-recommendation/latest', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
          if (!res.ok) throw new Error('Failed to fetch');
          const json = await res.json();
          const data = json.success ? json.data : null;
          
          if (data && data.status === 'COMPLETED') {
            setIsUpdatingRec(false);
            setRecData(data.recommendations || []);
            setRecExplanation(data.explanation || '');
            setRecTimestamp(Date.now());
            setPollCount(0);
          } else {
            setPollCount(p => p + 1);
            if (pollCount + 1 >= 10) {
              setIsUpdatingRec(false);
              setRecError('Still generating recommendations... Please refresh in a moment.');
            }
          }
        } catch (err) {
          setPollCount(p => p + 1);
        }
      }, 3000);
    }
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isUpdatingRec, pollCount]);

  const handleViewRecommendations = async () => {
    if (!user) return;
    
    if (recData && recData.length > 0) {
      setShowRecSection(true);
      return;
    }

    setShowRecSection(true);
    setIsRecLoading(true);
    setRecError('');

    try {
      const res = await fetch('/api/ai/problem-recommendation/latest', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      const data = json.success ? json.data : null;
      
      if (data && data.status === 'COMPLETED') {
        setRecData(data.recommendations || []);
        setRecExplanation(data.explanation || '');
        setRecTimestamp(Date.now());
      } else {
        setIsUpdatingRec(true);
        setPollCount(0);
        await fetch('/api/ai/problem-recommendation/run-background', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (error) {
      console.error(error);
      setRecError('Unable to load recommendations. Please try again.');
    } finally {
      setIsRecLoading(false);
    }
  };

  const handleRefreshRecommendations = async () => {
    if (!user || isUpdatingRec) return;
    
    setRecError('');
    setIsUpdatingRec(true);
    setPollCount(0);
    
    try {
      await fetch('/api/ai/problem-recommendation/run-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error(error);
      setRecError('Unable to load recommendations. Please try again.');
      setIsUpdatingRec(false);
    }
  };

  useEffect(() => {
    let active = true;

    const loadData = () => {
      fetch('/api/progress/roadmap')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch roadmap data');
          return res.json();
        })
        .then((json) => {
          if (active && json.success) {
            setData(json);
          }
        })
        .catch((err) => {
          console.error('Error fetching roadmap:', err);
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    };

    loadData();

    const handleRefresh = () => {
      loadData();
    };

    window.addEventListener('skill-lens:practice-progress-updated', handleRefresh);

    return () => {
      active = false;
      window.removeEventListener('skill-lens:practice-progress-updated', handleRefresh);
    };
  }, []);

  const overallCompletion = data?.stats?.overallCompletion ?? 0;
  const completedTopicsCount = data?.stats?.completedTopicsCount ?? 0;
  const totalProblemsSolved = data?.stats?.totalProblemsSolved ?? 0;
  
  // Calculate completion percentage based on current node
  const nodes = data?.roadmapNodes || roadmapNodes;
  const mastery = data?.skillMastery || skillMastery;
  
  const currentNodeIndex = nodes.findIndex((n: any) => n.status === 'current' || n.status === 'in-progress');
  const targetProgress = currentNodeIndex === -1 ? 1 : currentNodeIndex / (nodes.length || 1);
  const smoothProgress = useSpring(targetProgress, { stiffness: 40, damping: 20 });

  const themeClass = isDark
    ? 'dark bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a103c] via-[#0d081e] to-[#070510] text-slate-100'
    : 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-50 via-slate-50 to-slate-100 text-slate-900';

  const panelClass = isDark
    ? 'rounded-2xl border border-white/[0.06] bg-[#120d20]/80 backdrop-blur-xl shadow-xl'
    : 'rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xl';

  // Calculate current stage title dynamically
  const currentStageNode = nodes.find((n: any) => n.status === 'current' || n.status === 'in-progress');
  const currentStageTitle = currentStageNode ? currentStageNode.title : 'All Mastered!';

  // Dynamic AI coach advice
  const coachAdviceTitle =
    overallCompletion === 0
      ? 'Start with the Basics.'
      : overallCompletion < 50
        ? 'Making steady progress!'
        : 'Tackling advanced topics!';

  const coachAdviceText =
    overallCompletion === 0
      ? 'You are at the beginning of your journey. Solve foundational problems to start building your mastery score.'
      : `You have completed ${completedTopicsCount} topics. Keep practicing to build confidence and unlock remaining modules.`;

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex min-h-screen items-center justify-center font-sans antialiased',
          themeClass,
        )}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="text-sm font-bold tracking-wider text-violet-400">
            LOADING DYNAMIC ROADMAP...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'min-h-screen overflow-x-hidden font-sans antialiased transition-all duration-500',
        themeClass,
      )}
      ref={containerRef}
    >
      {/* 3D Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <Suspense fallback={null}>
          <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
            <ambientLight intensity={isDark ? 0.6 : 1.2} />
            <CodingRoadmap3D isDark={isDark} />
          </Canvas>
        </Suspense>
      </div>

      {/* Top Navigation */}
      <TopNavigation isDark={isDark} setIsDark={setIsDark} activeTab="roadmap" />

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-[1400px] px-4 pb-32 pt-36 sm:px-6 lg:px-8">
        {/* Animated Header */}
        <motion.div
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="mb-16 text-center"
        >
          <h1
            className={cn(
              'bg-gradient-to-b bg-clip-text text-5xl font-black tracking-tighter text-transparent md:text-7xl',
              isDark
                ? 'from-white via-slate-200 to-violet-400'
                : 'from-slate-900 via-slate-700 to-violet-600',
            )}
          >
            YOUR ROADMAP
          </h1>
          <p
            className={cn(
              'mx-auto mt-6 max-w-2xl text-lg font-medium',
              isDark ? 'text-slate-400' : 'text-slate-600',
            )}
          >
            Track your progress, unlock new topics, and follow a structured, interactive path from
            beginner to advanced problem solving.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_400px]">
          {/* Left Column: The Interactive Winding Roadmap */}
          <div className="relative py-10">
            {/* The Winding SVG Path */}
            <div className="pointer-events-none absolute bottom-0 left-1/2 top-0 z-0 w-[200px] -translate-x-1/2">
              <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 200 1000">
                <path
                  d="M100,0 C200,150 0,300 100,500 C200,700 0,850 100,1000"
                  fill="none"
                  strokeWidth="4"
                  className={cn(isDark ? 'stroke-white/[0.05]' : 'stroke-slate-200')}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <svg
                className="absolute inset-0 h-full w-full"
                preserveAspectRatio="none"
                viewBox="0 0 200 1000"
              >
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

            <div className="relative z-10 space-y-28">
              {nodes.map((node: any) => {
                const isLeft = node.position === 'left';
                const isLocked = node.status === 'locked';
                const isCurrent = node.status === 'current';
                const isInProgress = node.status === 'in-progress';
                const isExpanded = expandedNode === node.id;

                return (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, y: 60, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: false, amount: 0.3, margin: '0px 0px -100px 0px' }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={cn(
                      'relative flex w-full items-center',
                      isLeft
                        ? 'justify-start md:pr-[55%]'
                        : 'flex-row-reverse justify-end md:flex-row md:pl-[55%]',
                    )}
                  >
                    {/* Interactive Node Card */}
                    <div
                      onClick={() => setExpandedNode(isExpanded ? null : node.id)}
                      className={cn(
                        'group relative w-full cursor-pointer p-6 transition-all duration-500',
                        panelClass,
                        'hover:scale-[1.02] hover:shadow-[0_15px_30px_rgba(139,92,246,0.2)]',
                        isLocked && !isExpanded ? 'opacity-80' : 'opacity-100',
                        (isCurrent || isInProgress) &&
                          (isDark
                            ? 'bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.3)] ring-2 ring-violet-500'
                            : 'bg-violet-50 shadow-xl ring-2 ring-violet-500'),
                        isExpanded && 'z-20 ring-2 ring-cyan-400',
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <h3
                          className={cn(
                            'text-xl font-bold transition-colors',
                            isDark
                              ? 'text-white group-hover:text-violet-300'
                              : 'text-slate-900 group-hover:text-violet-700',
                          )}
                        >
                          {node.title}
                        </h3>
                        <div
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-full transition-transform group-hover:scale-110',
                            isLocked
                              ? isDark
                                ? 'bg-white/10 text-slate-400'
                                : 'bg-slate-200 text-slate-500'
                              : isCurrent
                                ? 'bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.6)]'
                                : isInProgress
                                  ? 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.6)]'
                                  : 'bg-emerald-500 text-white',
                          )}
                        >
                          {isLocked ? (
                            <Lock className="h-4 w-4" />
                          ) : isCurrent ? (
                            <PlayCircle className="h-4 w-4" />
                          ) : isInProgress ? (
                            <Activity className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </div>
                      </div>

                      <p
                        className={cn(
                          'mb-4 text-sm font-semibold',
                          isDark ? 'text-slate-400' : 'text-slate-500',
                        )}
                      >
                        {isCurrent
                          ? 'Up Next'
                          : isInProgress
                            ? 'In Progress'
                            : isLocked
                              ? 'Requires Previous Module'
                              : 'Mastered'}
                      </p>

                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider',
                            isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700',
                          )}
                        >
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
                            <div
                              className={cn(
                                'border-t pt-4',
                                isDark ? 'border-white/10' : 'border-slate-200',
                              )}
                            >
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <p
                                    className={cn(
                                      'mb-1 text-[10px] font-bold uppercase tracking-wider',
                                      isDark ? 'text-slate-500' : 'text-slate-400',
                                    )}
                                  >
                                    Completion
                                  </p>
                                  <p
                                    className={cn(
                                      'text-lg font-black',
                                      isDark ? 'text-cyan-400' : 'text-violet-600',
                                    )}
                                  >
                                    {node.stats.completion}%
                                  </p>
                                </div>
                                <div>
                                  <p
                                    className={cn(
                                      'mb-1 text-[10px] font-bold uppercase tracking-wider',
                                      isDark ? 'text-slate-500' : 'text-slate-400',
                                    )}
                                  >
                                    Accuracy
                                  </p>
                                  <p
                                    className={cn(
                                      'text-lg font-black',
                                      isDark ? 'text-emerald-400' : 'text-emerald-600',
                                    )}
                                  >
                                    {node.stats.accuracy}%
                                  </p>
                                </div>
                                <div>
                                  <p
                                    className={cn(
                                      'mb-1 text-[10px] font-bold uppercase tracking-wider',
                                      isDark ? 'text-slate-500' : 'text-slate-400',
                                    )}
                                  >
                                    Time
                                  </p>
                                  <p
                                    className={cn(
                                      'text-lg font-black',
                                      isDark ? 'text-white' : 'text-slate-900',
                                    )}
                                  >
                                    {node.stats.timeSpent}
                                  </p>
                                </div>
                              </div>
                              {isLocked ? (
                                <Link
                                  to={(currentStageNode && mapNodeIdToTopic(currentStageNode.id) !== 'All'
                                      ? `/practice?topic=${encodeURIComponent(mapNodeIdToTopic(currentStageNode.id))}`
                                      : '/practice') as any}
                                  className="mt-6 block w-full"
                                >
                                  <Button className="w-full bg-slate-600 font-bold text-white hover:bg-slate-500">
                                    {currentStageNode
                                      ? `Practice ${currentStageNode.title} First`
                                      : 'View Prerequisites'}
                                  </Button>
                                </Link>
                              ) : (
                                <Link
                                  to={(mapNodeIdToTopic(node.id) !== 'All'
                                      ? `/practice?topic=${encodeURIComponent(mapNodeIdToTopic(node.id))}`
                                      : '/practice') as any}
                                  className="mt-6 block w-full"
                                >
                                  <Button className="w-full bg-violet-600 font-bold text-white hover:bg-violet-500">
                                    {isCurrent ? 'Continue Practice' : 'Review Problems'}
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* The Center Node Dot */}
                    <div
                      className="absolute left-1/2 z-20 flex h-8 w-8 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border-4 transition-transform hover:scale-125"
                      style={
                        {
                          backgroundColor: isDark ? '#0d081e' : '#f8fafc',
                          borderColor: isDark ? '#0d081e' : '#f8fafc',
                        } as React.CSSProperties
                      }
                    >
                      <div
                        className={cn(
                          'h-full w-full rounded-full transition-colors duration-500',
                          isLocked
                            ? isDark
                              ? 'bg-slate-700'
                              : 'bg-slate-300'
                            : 'bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,1)]',
                        )}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Sticky Sidebar Stats */}
          <div className="h-fit space-y-6 md:sticky md:top-28">
            <AiRoadmapPanel isDark={isDark} />

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ y: -6, scale: 1.015 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={cn(
                panelClass,
                'cursor-default p-6 transition-[border-color,background-color,box-shadow] duration-300',
                isDark
                  ? 'hover:border-violet-500/50 hover:bg-violet-500/[0.08] hover:shadow-[0_18px_45px_rgba(139,92,246,0.2)]'
                  : 'hover:border-violet-300 hover:bg-violet-50/90 hover:shadow-[0_18px_45px_rgba(109,40,217,0.15)]',
              )}
            >
              <h2
                className={cn(
                  'mb-6 text-xs font-black uppercase tracking-widest',
                  isDark ? 'text-slate-400' : 'text-slate-500',
                )}
              >
                Progress Overview
              </h2>
              <div className="mb-6 flex items-baseline gap-2">
                <span
                  className={cn('text-6xl font-black', isDark ? 'text-white' : 'text-slate-900')}
                >
                  {overallCompletion}%
                </span>
                <span
                  className={cn(
                    'text-sm font-bold uppercase',
                    isDark ? 'text-slate-500' : 'text-slate-500',
                  )}
                >
                  Overall
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span
                    className={isDark ? 'font-medium text-slate-400' : 'font-medium text-slate-600'}
                  >
                    Topics Completed
                  </span>
                  <span className={cn('font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                    {completedTopicsCount} / {nodes.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span
                    className={isDark ? 'font-medium text-slate-400' : 'font-medium text-slate-600'}
                  >
                    Problems Solved
                  </span>
                  <span className={cn('font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                    {totalProblemsSolved}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span
                    className={isDark ? 'font-medium text-slate-400' : 'font-medium text-slate-600'}
                  >
                    Current Stage
                  </span>
                  <span className="font-bold text-violet-500">{currentStageTitle}</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ y: -6, scale: 1.015 }}
              transition={{ delay: 0.1, duration: 0.25, ease: 'easeOut' }}
              className={cn(
                panelClass,
                'relative cursor-default overflow-hidden p-6 transition-[border-color,background-color,box-shadow] duration-300',
                isDark
                  ? 'hover:border-cyan-400/50 hover:bg-cyan-500/[0.07] hover:shadow-[0_18px_45px_rgba(34,211,238,0.18)]'
                  : 'hover:border-cyan-300 hover:bg-cyan-50/90 hover:shadow-[0_18px_45px_rgba(8,145,178,0.14)]',
              )}
            >
              <div
                className={cn(
                  'absolute right-0 top-0 -z-10 h-40 w-40 rounded-full blur-[60px]',
                  isDark ? 'bg-cyan-500/20' : 'bg-cyan-400/20',
                )}
              />
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
                  <Bot className="h-5 w-5" />
                </div>
                <h2
                  className={cn(
                    'text-xs font-black uppercase tracking-widest',
                    isDark ? 'text-cyan-400' : 'text-blue-700',
                  )}
                >
                  AI Coach Advice
                </h2>
              </div>
              <p className={cn('mb-3 text-xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                {coachAdviceTitle}
              </p>
              <p
                className={cn(
                  'mb-6 text-sm font-medium leading-relaxed',
                  isDark ? 'text-slate-400' : 'text-slate-600',
                )}
              >
                {coachAdviceText}
              </p>
              {!showRecSection ? (
                <Button 
                  onClick={handleViewRecommendations}
                  disabled={isRecLoading}
                  className="w-full bg-cyan-500 font-black tracking-wide text-slate-950 hover:bg-cyan-400"
                >
                  {isRecLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  View Recommended Problems
                </Button>
              ) : (
                <div className="mt-4 space-y-4 rounded-xl bg-black/20 p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={cn("text-sm font-bold flex items-center gap-2", isDark ? "text-cyan-400" : "text-blue-700")}>
                      <Target className="h-4 w-4" /> Recommended for You
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleRefreshRecommendations}
                      disabled={isUpdatingRec}
                      className={cn("h-8 px-2 text-xs", isDark ? "hover:bg-white/10 text-slate-300" : "hover:bg-black/5")}
                    >
                      <RefreshCw className={cn("h-3 w-3 mr-1", isUpdatingRec ? "animate-spin" : "")} />
                      Refresh
                    </Button>
                  </div>

                  {recError && (
                    <div className="rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
                      {recError}
                    </div>
                  )}

                  {isUpdatingRec && !recError && (
                    <div className="flex items-center gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing your progress and generating new recommendations...
                    </div>
                  )}

                  {!isUpdatingRec && recData && recData.length > 0 && (
                    <div className="space-y-3">
                      {recData.map((rec: any, idx: number) => (
                        <div key={idx} className={cn("rounded-lg p-3 border", isDark ? "bg-[#1a1a24] border-white/10" : "bg-white border-slate-200")}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                              {rec.title}
                            </span>
                            <span className={cn(
                              "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full",
                              rec.difficulty === 'Easy' ? "bg-green-500/20 text-green-400" :
                              rec.difficulty === 'Medium' ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-red-500/20 text-red-400"
                            )}>
                              {rec.difficulty}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {rec.topics?.map((topic: string) => (
                              <span key={topic} className={cn("text-[10px] px-1.5 py-0.5 rounded", isDark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-600")}>
                                {topic}
                              </span>
                            ))}
                          </div>
                          {rec.slug !== 'all-solved' && (
                            <div className="mt-3">
                              <Link to="/editor/$problemSlug" params={{ problemSlug: rec.slug }}>
                                <Button size="sm" variant="secondary" className="w-full text-xs h-8">
                                  Solve Problem
                                </Button>
                              </Link>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {recExplanation && (
                        <div className={cn("mt-4 p-3 rounded-lg text-xs leading-relaxed border", isDark ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-200" : "bg-indigo-50 border-indigo-100 text-indigo-800")}>
                          <p className="font-semibold mb-1 opacity-80 uppercase tracking-wider text-[10px]">Why these problems?</p>
                          {recExplanation}
                        </div>
                      )}

                      {recTimestamp && (
                        <div className="text-[10px] text-right text-slate-500 mt-2 italic">
                          Recommended {Math.floor((Date.now() - recTimestamp) / 60000)} minutes ago
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ y: -6, scale: 1.015 }}
              transition={{ delay: 0.2, duration: 0.25, ease: 'easeOut' }}
              className={cn(
                panelClass,
                'cursor-default p-6 transition-[border-color,background-color,box-shadow] duration-300',
                isDark
                  ? 'hover:border-violet-500/50 hover:bg-violet-500/[0.08] hover:shadow-[0_18px_45px_rgba(139,92,246,0.2)]'
                  : 'hover:border-violet-300 hover:bg-violet-50/90 hover:shadow-[0_18px_45px_rgba(109,40,217,0.15)]',
              )}
            >
              <h2
                className={cn(
                  'mb-6 text-xs font-black uppercase tracking-widest',
                  isDark ? 'text-slate-400' : 'text-slate-500',
                )}
              >
                Skill Mastery
              </h2>
              <div className="space-y-5">
                {mastery.map((skill: any) => (
                  <div key={skill.name}>
                    <div className="mb-2 flex justify-between text-xs font-bold">
                      <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                        {skill.name}
                      </span>
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                        {skill.progress}%
                      </span>
                    </div>
                    <div
                      className={cn(
                        'h-2 w-full overflow-hidden rounded-full',
                        isDark ? 'bg-white/10' : 'bg-slate-200',
                      )}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${skill.progress}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
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
  );
}
