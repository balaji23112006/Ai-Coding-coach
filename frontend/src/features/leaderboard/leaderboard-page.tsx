import { useState, useEffect, useRef, Suspense, useMemo } from 'react';

// Third-party libraries
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import { ChevronDown, Flame, Search, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Internal imports
import { cn } from '@/lib/utils';
import type { LeaderboardEntry } from './types';
import { TopNavigation } from '@/components/common/top-navigation';
import { AiHelper } from '@/components/common/ai-helper';

// --- Master Animation Variants ---
const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.05,
    },
  },
};
const blockVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  },
};

// --- Shared 3D Geometries & Materials (Instantiated once to prevent memory leaks/WebGL context OOM) ---
const baseTrophyGeometries = {
  base: new THREE.CylinderGeometry(0.4, 0.5, 0.25, 12),
  stem: new THREE.CylinderGeometry(0.12, 0.12, 0.5, 12),
  bowl: new THREE.CylinderGeometry(0.5, 0.2, 0.6, 12, 1, true),
  inside: new THREE.SphereGeometry(0.2, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  handle: new THREE.TorusGeometry(0.18, 0.05, 6, 12, Math.PI),
};

const baseTrophyMaterials = {
  wood: new THREE.MeshStandardMaterial({ color: '#78350f', metalness: 0.7, roughness: 0.3 }),
  gold: new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.9, roughness: 0.15 }),
  goldDouble: new THREE.MeshStandardMaterial({
    color: '#fbbf24',
    metalness: 0.9,
    roughness: 0.15,
    side: THREE.DoubleSide,
  }),
};

const baseStarGeometry = new THREE.OctahedronGeometry(0.2, 0);
const baseStarMaterial = new THREE.MeshStandardMaterial({
  color: '#fcd34d',
  metalness: 0.9,
  roughness: 0.1,
});

function TrophyModel() {
  return (
    <group>
      {/* Trophy Base */}
      <mesh
        position={[0, -0.6, 0]}
        geometry={baseTrophyGeometries.base}
        material={baseTrophyMaterials.wood}
      />

      {/* Trophy Stem */}
      <mesh
        position={[0, -0.25, 0]}
        geometry={baseTrophyGeometries.stem}
        material={baseTrophyMaterials.gold}
      />

      {/* Trophy Bowl */}
      <mesh
        position={[0, 0.3, 0]}
        geometry={baseTrophyGeometries.bowl}
        material={baseTrophyMaterials.goldDouble}
      />

      {/* Inside the Bowl */}
      <mesh
        position={[0, 0.1, 0]}
        geometry={baseTrophyGeometries.inside}
        material={baseTrophyMaterials.gold}
      />

      {/* Left handle */}
      <mesh
        position={[-0.38, 0.3, 0]}
        rotation={[0, 0, Math.PI / 4]}
        geometry={baseTrophyGeometries.handle}
        material={baseTrophyMaterials.gold}
      />

      {/* Right handle */}
      <mesh
        position={[0.38, 0.3, 0]}
        rotation={[0, 0, -Math.PI / 4]}
        geometry={baseTrophyGeometries.handle}
        material={baseTrophyMaterials.gold}
      />
    </group>
  );
}

function StarModel() {
  return <mesh geometry={baseStarGeometry} material={baseStarMaterial} />;
}

// --- Cascading / Floating Background System for Whole Page ---
const cascadingItemsCount = 14;
const initialCascadingItems = Array.from({ length: cascadingItemsCount }, (_, i) => {
  const typeVal = Math.random() < 0.25 ? 'trophy' : Math.random() < 0.5 ? 'star' : 'symbol';
  const symbolList = ['{ }', '</>', '=>', '[]', '()', '&&', '||', '1st', '2nd', '3rd'];
  return {
    id: i,
    x: (Math.random() - 0.5) * 16, // -8 to 8
    y: (Math.random() - 0.5) * 16, // -8 to 8 (pre-distribute)
    z: (Math.random() - 0.5) * 6 - 3, // -6 to 0
    speed: 0.12 + Math.random() * 0.2,
    wobbleSpeed: 0.3 + Math.random() * 0.8,
    wobbleAmount: 0.1 + Math.random() * 0.2,
    rotSpeed: [
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.6,
      (Math.random() - 0.5) * 0.3,
    ] as [number, number, number],
    type: typeVal,
    symbol: symbolList[Math.floor(Math.random() * symbolList.length)],
    scale:
      typeVal === 'trophy'
        ? 0.3 + Math.random() * 0.2
        : typeVal === 'star'
          ? 0.4 + Math.random() * 0.3
          : 0.5 + Math.random() * 0.3,
    phase: Math.random() * Math.PI * 2,
  };
});

function FloatingItem({
  item,
  isDark,
}: {
  item: (typeof initialCascadingItems)[0];
  isDark: boolean;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();

    // Slow downward movement (cascade)
    ref.current.position.y -= item.speed * 0.04;

    // Horizontal sway
    ref.current.position.x =
      item.x + Math.sin(t * item.wobbleSpeed + item.phase) * item.wobbleAmount;

    // Rotation over time
    ref.current.rotation.x += item.rotSpeed[0] * 0.01;
    ref.current.rotation.y += item.rotSpeed[1] * 0.01;
    ref.current.rotation.z += item.rotSpeed[2] * 0.01;

    // Recycle item back to the top once it drifts below the viewport
    if (ref.current.position.y < -8) {
      ref.current.position.y = 8;
      ref.current.position.x = (Math.random() - 0.5) * 16;
    }
  });

  return (
    <group ref={ref} position={[item.x, item.y, item.z]} scale={item.scale}>
      {item.type === 'trophy' && <TrophyModel />}
      {item.type === 'star' && <StarModel />}
      {item.type === 'symbol' && (
        <Text
          fontSize={0.4}
          color={isDark ? '#c4b5fd' : '#6d28d9'}
          anchorX="center"
          anchorY="middle"
          fillOpacity={isDark ? 0.35 : 0.5}
        >
          {item.symbol}
        </Text>
      )}
    </group>
  );
}

function TrophyEnvironment3D({ isDark }: { isDark: boolean }) {
  const topWireframeRef = useRef<THREE.Mesh>(null);
  const bottomWireframeRef = useRef<THREE.Mesh>(null);
  const mainTrophyRef = useRef<THREE.Group>(null);
  const mainGroupRef = useRef<THREE.Group>(null); // tilts the entire page background

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Rotate top wireframe sphere
    if (topWireframeRef.current) {
      topWireframeRef.current.rotation.x = t * 0.06;
      topWireframeRef.current.rotation.y = t * 0.09;
    }

    // Rotate bottom wireframe sphere (slower, opposite direction)
    if (bottomWireframeRef.current) {
      bottomWireframeRef.current.rotation.x = -t * 0.04;
      bottomWireframeRef.current.rotation.y = -t * 0.05;
    }

    // Rotate top central trophy
    if (mainTrophyRef.current) {
      mainTrophyRef.current.rotation.y = t * 0.4;
    }

    // Smooth background parallax tilt relative to mouse cursor
    if (mainGroupRef.current) {
      const targetX = state.pointer.x * 0.15;
      const targetY = state.pointer.y * 0.15;
      mainGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        mainGroupRef.current.rotation.x,
        -targetY,
        0.05,
      );
      mainGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        mainGroupRef.current.rotation.y,
        targetX,
        0.05,
      );
    }
  });

  return (
    <group ref={mainGroupRef}>
      {/* Top Section - Behind the COMMUNITY RANK text */}
      <group position={[0, 3.8, 0]}>
        {/* Central Tech Wireframe Sphere */}
        <Sphere ref={topWireframeRef} args={[2.8, 10, 10]}>
          <meshBasicMaterial
            color={isDark ? '#8b5cf6' : '#7c3aed'}
            wireframe
            transparent
            opacity={isDark ? 0.12 : 0.35}
          />
        </Sphere>

        {/* Floating Central Metallic Trophy */}
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.6}>
          <group ref={mainTrophyRef} scale={1.2}>
            <TrophyModel />
          </group>
        </Float>

        {/* Orbiting stars at the top */}
        {Array.from({ length: 4 }).map((_, idx) => {
          const angle = (idx / 4) * Math.PI * 2;
          const radius = 3.6;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          const y = idx % 2 === 0 ? 0.5 : -0.5;

          return (
            <Float key={idx} speed={1.5 + idx} rotationIntensity={1} floatIntensity={1}>
              <group position={[x, y, z]}>
                <StarModel />
              </group>
            </Float>
          );
        })}
      </group>

      {/* Bottom Section - Behind the Table Standings */}
      <group position={[0, -3.5, 0]}>
        {/* Larger Wireframe Sphere for deeper scroll background */}
        <Sphere ref={bottomWireframeRef} args={[3.8, 8, 8]}>
          <meshBasicMaterial
            color={isDark ? '#6366f1' : '#4f46e5'}
            wireframe
            transparent
            opacity={isDark ? 0.06 : 0.1}
          />
        </Sphere>
      </group>

      {/* Cascading elements covering the entire viewport/screen height */}
      {initialCascadingItems.map((item) => (
        <FloatingItem key={item.id} item={item} isDark={isDark} />
      ))}
    </group>
  );
}

// --- Main Page Component ---
export function LeaderboardPage() {
  const [isDark, setIsDark] = useState(true);
  const [timeframe, setTimeframe] = useState<'all-time' | 'monthly' | 'weekly'>('all-time');
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('All');
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadData = () => {
      fetch('/api/progress/leaderboard')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch leaderboard data');
          return res.json();
        })
        .then((json) => {
          if (active && json.success && json.leaderboard) {
            setLeaderboardData(json.leaderboard);
          }
        })
        .catch((err) => {
          console.error('Error fetching leaderboard:', err);
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    };

    loadData();

    const handleRefresh = () => {
      loadData();
    };

    window.addEventListener('skill-lens:leaderboard-refresh-requested', handleRefresh);
    window.addEventListener('skill-lens:practice-progress-updated', handleRefresh);

    return () => {
      active = false;
      window.removeEventListener('skill-lens:leaderboard-refresh-requested', handleRefresh);
      window.removeEventListener('skill-lens:practice-progress-updated', handleRefresh);
    };
  }, []);

  // Theme Gradients and panels matching Dashboard Page
  const themeClass = isDark
    ? 'dark bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#171033] via-[#09090b] to-[#050505] text-slate-100'
    : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-100 via-slate-50 to-white text-slate-900';

  const panelClass = isDark
    ? 'rounded-2xl border border-violet-500/20 bg-[#121214]/80 backdrop-blur-md shadow-lg shadow-violet-950/20'
    : 'rounded-2xl border border-violet-300/80 bg-white/85 backdrop-blur-md shadow-xl shadow-violet-200/40';

  // Extract all languages for filter dropdown
  const allLanguages = useMemo(() => {
    const langs = new Set<string>();
    leaderboardData.forEach((user) => {
      user.languages.forEach((l: string) => langs.add(l));
    });
    return ['All', ...Array.from(langs)];
  }, [leaderboardData]);

  // Filter and sort user data based on interactive controls
  const filteredUsers = useMemo(() => {
    return leaderboardData
      .filter((user) => {
        const matchesSearch = user.username.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLanguage = languageFilter === 'All' || user.languages.includes(languageFilter);
        return matchesSearch && matchesLanguage;
      })
      .map((user) => {
        let masteryModifier = user.masteryScore;
        let totalModifier = user.problemsSolved.total;

        if (timeframe === 'monthly') {
          masteryModifier = Math.round(user.masteryScore * 0.4);
          totalModifier = Math.round(user.problemsSolved.total * 0.4);
        } else if (timeframe === 'weekly') {
          masteryModifier = Math.round(user.masteryScore * 0.12);
          totalModifier = Math.round(user.problemsSolved.total * 0.12);
        }

        return {
          ...user,
          displayScore: masteryModifier,
          displaySolved: totalModifier,
        };
      })
      .sort((a, b) => b.displayScore - a.displayScore);
  }, [leaderboardData, searchQuery, languageFilter, timeframe]);

  // Extract podium positions
  const podium = useMemo(() => {
    const first = filteredUsers.find((u) => u.rank === 1) || filteredUsers[0];
    const second = filteredUsers.find((u) => u.rank === 2) || filteredUsers[1];
    const third = filteredUsers.find((u) => u.rank === 3) || filteredUsers[2];
    return { first, second, third };
  }, [filteredUsers]);

  // Extract current user stats
  const currentUserStats = useMemo(() => {
    const currentUser = leaderboardData.find((u) => u.isCurrentUser);
    if (!currentUser) return null;
    return {
      ...currentUser,
      percentile: 'Top 100%',
      pointsToNext: 45,
    };
  }, [leaderboardData]);

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
            LOADING PEERS & RANKINGS...
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
    >
      {/* 3D Fixed Background */}
      <div
        className={cn(
          'pointer-events-none fixed inset-0 z-0 transition-opacity',
          isDark ? 'opacity-100' : 'opacity-75',
        )}
      >
        <Suspense fallback={null}>
          <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
            <ambientLight intensity={isDark ? 0.5 : 1.0} />
            <directionalLight position={[5, 5, 5]} intensity={1.5} />
            <pointLight position={[-5, -5, 5]} intensity={1.0} color="#8b5cf6" />
            <TrophyEnvironment3D isDark={isDark} />
          </Canvas>
        </Suspense>
      </div>

      <TopNavigation isDark={isDark} setIsDark={setIsDark} activeTab="leaderboard" />

      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col"
      >
        {/* Full-width Hero Banner with 3D animation */}
        <Hero />

        <main className="relative z-10 mx-auto -mt-16 w-full max-w-[1600px] space-y-8 px-4 pb-16 sm:px-6 lg:px-8">
          {/* Current User rank indicator card */}
          {currentUserStats && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <CurrentUserWidget stats={currentUserStats} panelClass={panelClass} isDark={isDark} />
            </motion.div>
          )}

          {/* Top 3 Podium Section */}
          <motion.section
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1], delay: 0.05 }}
            className="mx-auto grid max-w-5xl gap-6 pt-4 md:grid-cols-3"
          >
            {/* 2nd Place */}
            {podium.second && (
              <PodiumCard
                user={podium.second}
                place={2}
                panelClass={panelClass}
                isDark={isDark}
                glowColor="shadow-[0_0_25px_rgba(148,163,184,0.15)] border-slate-400/30"
              />
            )}
            {/* 1st Place */}
            {podium.first && (
              <PodiumCard
                user={podium.first}
                place={1}
                panelClass={panelClass}
                isDark={isDark}
                glowColor="shadow-[0_0_35px_rgba(251,191,36,0.25)] border-amber-400/40"
              />
            )}
            {/* 3rd Place */}
            {podium.third && (
              <PodiumCard
                user={podium.third}
                place={3}
                panelClass={panelClass}
                isDark={isDark}
                glowColor="shadow-[0_0_25px_rgba(180,83,9,0.15)] border-amber-700/30"
              />
            )}
          </motion.section>

          {/* Main List and Controls */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.75, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
            className={cn(panelClass, 'p-6 sm:p-8')}
          >
            <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className={cn('text-xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                  Leaderboard Standings
                </h2>
                <p
                  className={cn(
                    'mt-1 text-sm font-medium',
                    isDark ? 'text-slate-400' : 'text-slate-500',
                  )}
                >
                  Active coding learners matching filters: {filteredUsers.length}
                </p>
              </div>

              {/* Filtering Controls */}
              <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
                {/* Timeframe selector */}
                <div
                  className={cn(
                    'flex rounded-full border p-1',
                    isDark
                      ? 'border-white/[0.05] bg-white/[0.02]'
                      : 'border-slate-200 bg-slate-100',
                  )}
                >
                  {(['all-time', 'monthly', 'weekly'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={cn(
                        'rounded-full px-4 py-1.5 text-xs font-bold capitalize transition-all duration-300',
                        timeframe === t
                          ? isDark
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'bg-white text-violet-700 shadow-sm'
                          : isDark
                            ? 'text-slate-400 hover:text-white'
                            : 'text-slate-600 hover:text-slate-900',
                      )}
                    >
                      {t.replace('-', ' ')}
                    </button>
                  ))}
                </div>

                {/* Search query input */}
                <div className="relative flex-1 sm:w-60">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search
                      className={cn('h-4 w-4', isDark ? 'text-slate-500' : 'text-slate-400')}
                    />
                  </span>
                  <input
                    type="text"
                    placeholder="Search peers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      'w-full rounded-full border py-1.5 pl-9 pr-4 text-xs font-semibold outline-none transition-all duration-300',
                      isDark
                        ? 'border-violet-500/20 bg-[#161618] text-white placeholder:text-slate-600 focus:border-violet-500/50'
                        : 'border-violet-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-violet-400',
                    )}
                  />
                </div>

                {/* Language filter dropdown */}
                <div className="relative">
                  <select
                    value={languageFilter}
                    onChange={(e) => setLanguageFilter(e.target.value)}
                    className={cn(
                      'cursor-pointer appearance-none rounded-full border py-1.5 pl-4 pr-10 text-xs font-bold outline-none transition-all duration-300',
                      isDark
                        ? 'border-violet-500/20 bg-[#161618] text-white focus:border-violet-500/50'
                        : 'border-violet-200 bg-violet-50/70 text-slate-900 focus:border-violet-400',
                    )}
                  >
                    {allLanguages.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang === 'All' ? 'All Languages' : lang}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <ChevronDown
                      className={cn('h-4 w-4', isDark ? 'text-slate-500' : 'text-slate-400')}
                    />
                  </span>
                </div>
              </div>
            </div>

            {/* Leaderboard Table List */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr
                    className={cn(
                      'border-b text-xs font-bold uppercase tracking-wider',
                      isDark
                        ? 'border-white/[0.04] text-slate-500'
                        : 'border-slate-200 text-slate-400',
                    )}
                  >
                    <th className="w-20 px-4 py-4">Rank</th>
                    <th className="px-4 py-4">User</th>
                    <th className="px-4 py-4 text-center">Mastery Score</th>
                    <th className="px-4 py-4 text-center">Solved Total</th>
                    <th className="px-4 py-4 text-center">Streak</th>
                    <th className="hidden px-4 py-4 md:table-cell">Languages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-transparent">
                  <AnimatePresence initial={false}>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <motion.tr
                          key={user.username}
                          initial={{ opacity: 0, y: 12 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                          className={cn(
                            'group text-sm font-medium transition-all duration-300',
                            user.isCurrentUser
                              ? isDark
                                ? 'border-l-4 border-l-violet-500 bg-violet-600/10'
                                : 'border-l-4 border-l-violet-500 bg-violet-50'
                              : isDark
                                ? 'hover:bg-white/[0.02]'
                                : 'hover:bg-slate-50/50',
                          )}
                        >
                          {/* Rank & Trend column */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-black',
                                  user.rank === 1
                                    ? 'bg-amber-400 text-amber-950 shadow-sm'
                                    : user.rank === 2
                                      ? 'bg-slate-300 text-slate-900 shadow-sm'
                                      : user.rank === 3
                                        ? 'bg-amber-700 text-white shadow-sm'
                                        : isDark
                                          ? 'bg-white/[0.04] text-slate-300'
                                          : 'bg-slate-100 text-slate-600',
                                )}
                              >
                                {user.rank}
                              </span>
                              <TrendIndicator trend={user.rankTrend} isDark={isDark} />
                            </div>
                          </td>

                          {/* Username column */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  'flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-bold uppercase',
                                  user.isCurrentUser
                                    ? 'bg-violet-600 text-white'
                                    : isDark
                                      ? 'bg-white/[0.05] text-violet-300'
                                      : 'bg-violet-100 text-violet-700',
                                )}
                              >
                                {user.username.slice(0, 2)}
                              </span>
                              <div className="flex flex-col">
                                <span
                                  className={cn(
                                    'font-bold',
                                    user.isCurrentUser
                                      ? 'text-violet-500'
                                      : isDark
                                        ? 'text-slate-200 group-hover:text-white'
                                        : 'text-slate-800 group-hover:text-slate-950',
                                  )}
                                >
                                  {user.username}
                                </span>
                                {user.isCurrentUser && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
                                    You
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Mastery score column */}
                          <td className="px-4 py-4 text-center">
                            <div className="inline-flex flex-col items-center justify-center">
                              <span
                                className={cn(
                                  'text-base font-black',
                                  isDark ? 'text-white' : 'text-slate-900',
                                )}
                              >
                                {user.displayScore}
                              </span>
                              <div
                                className={cn(
                                  'mt-1 h-1 w-16 overflow-hidden rounded-full',
                                  isDark ? 'bg-white/10' : 'bg-slate-200',
                                )}
                              >
                                <div
                                  className="h-full bg-violet-500"
                                  style={
                                    {
                                      width: `${Math.min((user.displayScore / 1000) * 100, 100)}%`,
                                    } as React.CSSProperties
                                  }
                                />
                              </div>
                            </div>
                          </td>

                          {/* Solved stats column */}
                          <td className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span
                                className={cn(
                                  'font-bold',
                                  isDark ? 'text-slate-200' : 'text-slate-800',
                                )}
                              >
                                {user.displaySolved}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500">
                                {user.problemsSolved.easy}E · {user.problemsSolved.medium}M ·{' '}
                                {user.problemsSolved.hard}H
                              </span>
                            </div>
                          </td>

                          {/* Streak column */}
                          <td className="px-4 py-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <Flame
                                className={cn(
                                  'h-4 w-4',
                                  user.streak > 0
                                    ? 'fill-amber-500/10 text-amber-500'
                                    : 'text-slate-400',
                                )}
                              />
                              <span
                                className={cn(
                                  'text-xs font-bold',
                                  user.streak > 0
                                    ? isDark
                                      ? 'text-amber-400'
                                      : 'text-amber-600'
                                    : 'text-slate-400',
                                )}
                              >
                                {user.streak}d
                              </span>
                            </div>
                          </td>

                          {/* Active languages column */}
                          <td className="hidden px-4 py-4 md:table-cell">
                            <div className="flex flex-wrap gap-1.5">
                              {user.languages.length > 0 ? (
                                user.languages.map((l: string) => (
                                  <span
                                    key={l}
                                    className={cn(
                                      'rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide',
                                      isDark
                                        ? 'border border-white/[0.04] bg-white/[0.03] text-slate-400'
                                        : 'border border-slate-200/50 bg-slate-100 text-slate-600',
                                    )}
                                  >
                                    {l}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs italic text-slate-500">None yet</span>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <p className="text-sm font-semibold text-slate-500">
                            No competitive coders found matching filters.
                          </p>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>
        </main>
      </motion.div>

      <AiHelper isDark={isDark} />
    </div>
  );
}

// --- Dynamic Subcomponents ---

function Hero() {
  const description =
    'Code daily, level up your skills, and earn badges to climb the community leaderboard. Compare scores and share solutions.';

  return (
    <motion.section
      variants={blockVariants}
      className="relative flex min-h-[55vh] w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#07050f]/75 via-[#07050f]/45 to-transparent pb-24 pt-20 text-center shadow-2xl"
    >
      <div className="relative z-10 flex max-w-5xl flex-col items-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)', scale: 0.97 }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="bg-gradient-to-br from-white via-slate-200 to-violet-500/80 bg-clip-text text-5xl font-black tracking-tighter text-transparent drop-shadow-2xl sm:text-7xl md:text-8xl"
        >
          COMMUNITY RANK
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, duration: 0.7, ease: 'easeOut' }}
          className="mt-6 max-w-2xl text-sm font-medium leading-relaxed text-slate-300 drop-shadow-md sm:text-base md:text-lg"
        >
          {description}
        </motion.p>
      </div>
    </motion.section>
  );
}

function CurrentUserWidget({
  stats,
  panelClass,
  isDark,
}: {
  stats: LeaderboardEntry & { percentile: string; pointsToNext: number };
  panelClass: string;
  isDark: boolean;
}) {
  return (
    <div
      className={cn(
        panelClass,
        'flex cursor-default flex-col justify-between gap-6 border-l-4 border-l-violet-500 p-6 transition-all duration-300 lg:flex-row lg:items-center',
        isDark
          ? 'hover:border-violet-500/50 hover:bg-[#161618] hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]'
          : 'hover:border-violet-400 hover:bg-white hover:shadow-[0_10px_20px_rgba(139,92,246,0.1)]',
      )}
    >
      <div className="flex items-center gap-4">
        <span
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-base font-extrabold text-white shadow-md',
          )}
        >
          #{stats.rank}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h3 className={cn('text-lg font-black', isDark ? 'text-white' : 'text-slate-900')}>
              Your Rank Status
            </h3>
            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-400">
              {stats.username || 'Active Learner'}
            </span>
          </div>
          <p
            className={cn(
              'mt-1 text-xs font-semibold',
              isDark ? 'text-slate-500' : 'text-slate-500',
            )}
          >
            Solve problems to increase your Mastery Score and rise from rank #{stats.rank}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 divide-x divide-white/[0.04] sm:gap-12">
        <div className="pl-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Mastery Score
          </p>
          <p className={cn('mt-1 text-2xl font-black', isDark ? 'text-white' : 'text-slate-900')}>
            {stats.masteryScore}
          </p>
        </div>
        <div className="pl-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Solved Total
          </p>
          <p className={cn('mt-1 text-2xl font-black', isDark ? 'text-white' : 'text-slate-900')}>
            {stats.problemsSolved.total}
          </p>
        </div>
        <div className="pl-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Percentile
          </p>
          <p className="mt-1 text-2xl font-black text-violet-500">{stats.percentile}</p>
        </div>
      </div>
    </div>
  );
}

function PodiumCard({
  user,
  place,
  panelClass,
  isDark,
  glowColor,
}: {
  user: LeaderboardEntry & { displayScore: number; displaySolved: number };
  place: 1 | 2 | 3;
  panelClass: string;
  isDark: boolean;
  glowColor: string;
}) {
  const isFirst = place === 1;

  // Height adjustments based on podium places
  const heightClass = isFirst ? 'md:-translate-y-6 md:scale-105' : 'md:translate-y-2';
  const trophyColor =
    place === 1 ? 'text-amber-400' : place === 2 ? 'text-slate-300' : 'text-amber-700';
  const labelText = place === 1 ? '1st Place' : place === 2 ? '2nd Place' : '3rd Place';

  return (
    <motion.article
      whileHover={{ y: isFirst ? -12 : -4, scale: isFirst ? 1.06 : 1.02 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        panelClass,
        'relative flex cursor-default flex-col items-center justify-between overflow-hidden border p-6 transition-all duration-300',
        heightClass,
        glowColor,
      )}
    >
      {/* Background soft glow for 1st place */}
      {isFirst && (
        <div
          className={cn(
            'absolute -right-12 -top-12 -z-10 h-32 w-32 rounded-full blur-[45px]',
            isDark ? 'bg-amber-400/10' : 'bg-amber-300/20',
          )}
        />
      )}

      {/* Place Indicator Badge */}
      <div className="mb-4 flex flex-col items-center">
        <Trophy className={cn('mb-2 h-10 w-10 drop-shadow-md filter', trophyColor)} />
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest',
            place === 1
              ? isDark
                ? 'bg-amber-400/10 text-amber-300'
                : 'bg-amber-100 text-amber-800'
              : place === 2
                ? isDark
                  ? 'bg-slate-400/10 text-slate-300'
                  : 'bg-slate-100 text-slate-800'
                : isDark
                  ? 'bg-amber-700/10 text-amber-600'
                  : 'bg-amber-50 text-amber-900',
          )}
        >
          {labelText}
        </span>
      </div>

      {/* Avatar Icon */}
      <div
        className={cn(
          'relative mb-4 flex h-16 w-16 items-center justify-center rounded-full border text-xl font-black uppercase shadow-md',
          place === 1
            ? 'border-amber-300/40 bg-gradient-to-br from-amber-400 to-yellow-600 text-amber-950'
            : place === 2
              ? 'border-slate-400/40 bg-gradient-to-br from-slate-300 to-slate-500 text-slate-950'
              : 'border-amber-600/40 bg-gradient-to-br from-amber-700 to-amber-900 text-white',
        )}
      >
        {user.username.slice(0, 2)}
        {user.streak > 15 && (
          <span
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-red-600 text-white shadow-sm dark:border-zinc-950"
            title={`${user.streak} day streak`}
          >
            <Flame className="h-3 w-3 fill-white" />
          </span>
        )}
      </div>

      {/* Username and Stats */}
      <div className="w-full text-center">
        <h3
          className={cn(
            'truncate px-2 text-lg font-bold leading-tight',
            isDark ? 'text-white' : 'text-slate-900',
          )}
        >
          {user.username}
        </h3>
        <p className="mt-1 flex justify-center gap-1.5 text-xs font-semibold text-slate-500">
          <span>{user.displaySolved} Solved</span>
          <span>·</span>
          <span>🔥 {user.streak}d streak</span>
        </p>

        <div
          className={cn(
            'mt-5 flex flex-col items-center justify-center rounded-xl border px-4 py-2.5',
            isDark ? 'border-white/[0.04] bg-white/[0.02]' : 'border-slate-100 bg-slate-50',
          )}
        >
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
            Mastery Score
          </span>
          <span
            className={cn(
              'mt-0.5 text-2xl font-black tracking-tight',
              isDark ? 'text-white' : 'text-slate-900',
            )}
          >
            {user.displayScore}
          </span>
        </div>
      </div>
    </motion.article>
  );
}

function TrendIndicator({ trend, isDark }: { trend: 'up' | 'down' | 'same'; isDark: boolean }) {
  if (trend === 'up') {
    return (
      <span title="Climbing ranks">
        <TrendingUp className="h-4 w-4 shrink-0 text-emerald-500" />
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span title="Falling ranks">
        <TrendingDown className="h-4 w-4 shrink-0 text-red-500" />
      </span>
    );
  }
  return (
    <span title="Steady">
      <Minus className={cn('h-4 w-4 shrink-0', isDark ? 'text-slate-600' : 'text-slate-400')} />
    </span>
  );
}
