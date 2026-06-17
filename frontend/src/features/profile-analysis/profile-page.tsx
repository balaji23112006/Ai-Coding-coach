import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
} from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Sphere, Stars } from '@react-three/drei'
import * as THREE from 'three'
import {
  Bell,
  Bot,
  Camera,
  ChevronDown,
  Paintbrush,
  ShieldAlert,
  Terminal,
  Trophy,
  User,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useAuth } from '@/features/authentication'
import { TopNavigation } from '@/components/common/top-navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { badges, languages, roles } from './data/profile-data'
import type { PreferencesState, ThemePreference } from './types'

// --- Animation Variants ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
}

// --- 3D Background ---
function Profile3DBackground() {
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

  const particles = useMemo(() => {
    return [...Array(25)].map((_, i) => ({
      id: i,
      x: Math.sin(i * 12.9898) * 15,
      y: Math.cos(i * 78.233) * 15,
      z: Math.sin(i * 37.719) * 7.5 - 5,
      scale: 0.05 + ((i * 17) % 20) / 100,
    }))
  }, [])

  return (
    <group ref={groupRef}>
      {particles.map((node) => (
        <Float key={node.id} speed={1.5} rotationIntensity={1} floatIntensity={2}>
          <Sphere args={[node.scale, 16, 16]} position={[node.x, node.y, node.z]}>
            <meshBasicMaterial color="#8b5cf6" transparent opacity={0.3} wireframe />
          </Sphere>
        </Float>
      ))}
      <Stars radius={50} depth={50} count={1000} factor={3} saturation={0} fade speed={1} />
    </group>
  )
}

// --- Reusable UI Components ---
interface CustomInputProps {
  label: string
  value: string
  onChange?: ChangeEventHandler<HTMLInputElement>
  type?: string
  disabled?: boolean
}

function CustomInput({ label, value, onChange, type = 'text', disabled = false }: CustomInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full bg-[#09090b]/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all disabled:opacity-50"
      />
    </div>
  )
}

interface CustomSelectProps {
  label: string
  value: string
  options: string[]
  onChange?: ChangeEventHandler<HTMLSelectElement>
}

function CustomSelect({ label, value, options, onChange }: CustomSelectProps) {
  return (
    <div className="space-y-1.5 relative">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          className="w-full appearance-none bg-[#09090b]/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
        >
          {options.map((opt: string) => (
            <option key={opt} value={opt} className="bg-[#121214]">{opt}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  )
}

interface CustomToggleProps {
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
}

function CustomToggle({ label, description, enabled, onToggle }: CustomToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs font-medium text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
          enabled ? "bg-violet-500" : "bg-white/10"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
            enabled ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </div>
  )
}

// --- Main Page Component ---
export function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences'>('profile')
  const [showSignOut, setShowSignOut] = useState(false)

  const [systemIsDark, setSystemIsDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  const { logout, user, checkSession } = useAuth()
  const navigateTo = useNavigate()

  const [userData, setUserData] = useState({
    name: 'User',
    username: '',
    bio: '',
    email: 'user@gmail.com',
    joinDate: 'dd-mm-yyyy',
    role: 'Student',
    language: 'TypeScript',
  })

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  
  // Preference States
  const [preferences, setPreferences] = useState<PreferencesState>(() => ({
    theme: (localStorage.getItem('skill-lens-theme') as ThemePreference | null) ?? 'Dark',
    animations: localStorage.getItem('skill-lens-animations') !== 'false',
    wordWrap: localStorage.getItem('skill-lens-wordWrap') !== 'false',
    minimap: localStorage.getItem('skill-lens-minimap') === 'true',
    complexityAnalysis: localStorage.getItem('skill-lens-complexityAnalysis') !== 'false',
    autoCodeReview: localStorage.getItem('skill-lens-autoCodeReview') === 'true',
    personalizedRecs: localStorage.getItem('skill-lens-personalizedRecs') !== 'false',
    dailyReminders: localStorage.getItem('skill-lens-dailyReminders') !== 'false',
    streakAlerts: localStorage.getItem('skill-lens-streakAlerts') !== 'false',
    milestoneAlerts: localStorage.getItem('skill-lens-milestoneAlerts') !== 'false',
    editorTheme: localStorage.getItem('editor-theme') ?? 'VS Code Dark',
    fontSize: localStorage.getItem('editor-fontSize') ?? '14px',
    tabSize: localStorage.getItem('editor-tabSize') ?? '2 Spaces',
    hintStyle: localStorage.getItem('editor-hintStyle') ?? 'Balanced',
  }))

  const isDark = preferences.theme === 'System' ? systemIsDark : preferences.theme === 'Dark'
  const profileInitial = userData.name.trim().charAt(0).toUpperCase() || 'U'

  useEffect(() => {
    if (user) {
      setUserData({
        name: user.fullName || 'User',
        username: user.username || '',
        bio: user.bio || '',
        email: user.email || 'user@gmail.com',
        joinDate: user.createdAt
          ? new Date(user.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'dd-mm-yyyy',
        role: user.role || 'Student',
        language: user.language || 'TypeScript',
      })
    }
  }, [user])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = (event: MediaQueryListEvent) => setSystemIsDark(event.matches)

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [])

  function setTheme(theme: ThemePreference) {
    localStorage.setItem('skill-lens-theme', theme)
    setPreferences((current) => ({ ...current, theme }))
  }

  function togglePreference(key: keyof Omit<PreferencesState, 'theme' | 'editorTheme' | 'fontSize' | 'tabSize' | 'hintStyle'>) {
    setPreferences((current) => {
      const newValue = !current[key]
      localStorage.setItem(`skill-lens-${key}`, String(newValue))
      return { ...current, [key]: newValue }
    })
  }

  function updateSelectPreference(key: 'editorTheme' | 'fontSize' | 'tabSize' | 'hintStyle', value: string) {
    setPreferences((current) => {
      let lsKey = key
      if (key === 'editorTheme') lsKey = 'editor-theme' as any
      if (key === 'fontSize') lsKey = 'editor-fontSize' as any
      if (key === 'tabSize') lsKey = 'editor-tabSize' as any
      if (key === 'hintStyle') lsKey = 'editor-hintStyle' as any

      localStorage.setItem(lsKey, value)
      return { ...current, [key]: value }
    })
  }

  const handleSaveChanges = async () => {
    setSaveStatus('saving')
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: userData.name,
          bio: userData.bio,
          role: userData.role,
          language: userData.language,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Failed to update profile' }))
        throw new Error(errData.error || 'Failed to update profile')
      }

      await checkSession()
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err: any) {
      console.error('Error saving profile:', err)
      setErrorMessage(err.message || 'Error saving profile')
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 4000)
    }
  }

  return (
    <div className={cn(
      'min-h-screen overflow-x-hidden font-sans antialiased transition-colors duration-500',
      isDark
        ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a103c] via-[#0d081e] to-[#070510] text-slate-100'
        : 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-100 via-slate-50 to-white text-slate-900'
    )}>
      
      {/* 3D Background */}
      <div className={cn('fixed inset-0 z-0 pointer-events-none transition-opacity', isDark ? 'opacity-100' : 'opacity-35')}>
        <Suspense fallback={null}>
          <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <Profile3DBackground />
          </Canvas>
        </Suspense>
      </div>

      {/* Top Navigation */}
      <TopNavigation isDark={isDark} setIsDark={(val) => setTheme(val ? 'Dark' : 'Light')} activeTab="profile" />

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-[1000px] px-4 pt-32 pb-24 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className={cn('text-4xl font-black tracking-tighter', isDark ? 'text-white' : 'text-slate-900')}>ACCOUNT</h1>
          <p className="mt-2 text-sm font-medium text-slate-400">Manage your profile, preferences, and account settings.</p>
        </motion.div>

        {/* Custom Tabs */}
        <div className="flex items-center gap-2 mb-8 border-b border-white/10 pb-px">
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn("px-4 py-2.5 text-sm font-bold border-b-2 transition-colors", activeTab === 'profile' ? "border-violet-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300")}
          >
            Account
          </button>
          <button 
            onClick={() => setActiveTab('preferences')}
            className={cn("px-4 py-2.5 text-sm font-bold border-b-2 transition-colors", activeTab === 'preferences' ? "border-violet-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300")}
          >
            Settings
          </button>
        </div>

        {/* Render Active Tab */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="space-y-6"
          >
            {activeTab === 'profile' ? (
              <>
                {/* Profile Header & Bio */}
                <motion.section variants={itemVariants} className="rounded-2xl border border-white/[0.06] bg-[#121214]/60 backdrop-blur-xl p-8 shadow-xl">
                  <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
                    <div className="relative group cursor-pointer">
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 p-1">
                        <div className="w-full h-full rounded-full bg-[#09090b] flex items-center justify-center text-3xl font-black text-white">
                          {profileInitial}
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <input 
                          type="text" 
                          value={userData.name}
                          onChange={(e) => setUserData({...userData, name: e.target.value})}
                          className="bg-transparent text-3xl font-black text-white focus:outline-none focus:ring-0 border-b border-transparent focus:border-violet-500 w-full"
                        />
                        <p className="text-sm font-medium text-violet-400 mt-1">{userData.username}</p>
                      </div>
                      <textarea 
                        value={userData.bio}
                        onChange={(e) => setUserData({...userData, bio: e.target.value})}
                        className="w-full bg-[#09090b]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                </motion.section>

                {/* Personal Information */}
                <motion.section variants={itemVariants} className="rounded-2xl border border-white/[0.06] bg-[#121214]/60 backdrop-blur-xl p-8 shadow-xl">
                  <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-violet-400" /> Personal Information
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <CustomInput label="Email Address" value={userData.email} disabled />
                    <CustomInput label="Join Date" value={userData.joinDate} disabled />
                    <CustomSelect 
                      label="Target Career Role" 
                      value={userData.role} 
                      options={roles}
                      onChange={(e) => setUserData({...userData, role: e.target.value})}
                    />
                    <CustomSelect 
                      label="Preferred Language" 
                      value={userData.language} 
                      options={languages}
                      onChange={(e) => setUserData({...userData, language: e.target.value})}
                    />
                  </div>
                  <div className="mt-8 flex items-center justify-between gap-4">
                    {saveStatus === 'error' && (
                      <p className="text-xs font-bold text-rose-500">{errorMessage}</p>
                    )}
                    {saveStatus === 'success' && (
                      <p className="text-xs font-bold text-emerald-500">Profile saved successfully!</p>
                    )}
                    <div className="flex-1" />
                    <button 
                      onClick={handleSaveChanges}
                      disabled={saveStatus === 'saving'}
                      className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-violet-500/20"
                    >
                      {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </motion.section>

                {/* Achievement Showcase */}
                <motion.section variants={itemVariants} className="rounded-2xl border border-white/[0.06] bg-[#121214]/60 backdrop-blur-xl p-8 shadow-xl">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-400" /> Achievement Showcase
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {badges.length === 0 ? (
                      <div className="col-span-full rounded-xl border border-dashed border-white/10 bg-[#09090b]/30 p-8 text-center">
                        <p className="text-sm font-bold text-slate-400">0 achievements</p>
                      </div>
                    ) : (
                      badges.map((badge) => (
                        <div key={badge.title} className="group relative rounded-xl border border-white/5 bg-[#09090b]/50 p-4 text-center hover:bg-white/5 hover:border-white/10 transition-all cursor-default">
                          <div className={cn("mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110", badge.bg, badge.color)}>
                            <badge.icon className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-bold text-slate-200">{badge.title}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.section>
              </>
            ) : (
              <>
                {/* Appearance Settings */}
                <motion.section variants={itemVariants} className="rounded-2xl border border-white/[0.06] bg-[#121214]/60 backdrop-blur-xl p-8 shadow-xl">
                  <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Paintbrush className="w-5 h-5 text-cyan-400" /> Appearance
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">Theme Preference</label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['Dark', 'Light', 'System'] as ThemePreference[]).map((theme) => (
                          <button
                            key={theme}
                            onClick={() => setTheme(theme)}
                            type="button"
                            className={cn(
                              'py-2.5 rounded-xl text-sm font-bold border transition-all',
                              preferences.theme === theme
                                ? 'border-violet-500 bg-violet-500/15 text-violet-300 shadow-[0_0_18px_rgba(139,92,246,0.2)]'
                                : 'border-white/10 bg-[#09090b]/50 text-slate-400 hover:bg-white/5'
                            )}
                          >
                            {theme}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="pt-4 border-t border-white/5">
                      <CustomToggle 
                        label="Enable UI Animations" 
                        description="Smooth transitions and 3D background effects." 
                        enabled={preferences.animations} 
                        onToggle={() => togglePreference('animations')} 
                      />
                    </div>
                  </div>
                </motion.section>

                {/* Code Editor Preferences */}
                <motion.section variants={itemVariants} className="rounded-2xl border border-white/[0.06] bg-[#121214]/60 backdrop-blur-xl p-8 shadow-xl">
                  <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-emerald-400" /> Code Editor
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <CustomSelect 
                      label="Editor Theme" 
                      value={preferences.editorTheme} 
                      options={['VS Code Dark', 'Dracula', 'Monokai', 'GitHub Dark']} 
                      onChange={(e) => updateSelectPreference('editorTheme', e.target.value)}
                    />
                    <CustomSelect 
                      label="Font Size" 
                      value={preferences.fontSize} 
                      options={['12px', '14px', '16px', '18px']} 
                      onChange={(e) => updateSelectPreference('fontSize', e.target.value)}
                    />
                    <CustomSelect 
                      label="Tab Size" 
                      value={preferences.tabSize} 
                      options={['2 Spaces', '4 Spaces']} 
                      onChange={(e) => updateSelectPreference('tabSize', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 pt-4 border-t border-white/5">
                    <CustomToggle label="Word Wrap" description="Wrap lines that exceed the editor width." enabled={preferences.wordWrap} onToggle={() => togglePreference('wordWrap')} />
                    <CustomToggle label="Show Minimap" description="Display a miniature overview of the code." enabled={preferences.minimap} onToggle={() => togglePreference('minimap')} />
                  </div>
                </motion.section>

                {/* AI Coach Preferences */}
                <motion.section variants={itemVariants} className="rounded-2xl border border-white/[0.06] bg-[#121214]/60 backdrop-blur-xl p-8 shadow-xl">
                  <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-blue-400" /> AI Coach Settings
                  </h2>
                  <div className="mb-6">
                    <CustomSelect 
                      label="Hint Style" 
                      value={preferences.hintStyle} 
                      options={['Beginner Friendly', 'Balanced', 'Interview Focused']} 
                      onChange={(e) => updateSelectPreference('hintStyle', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 pt-4 border-t border-white/5">
                    <CustomToggle label="Complexity Analysis" description="AI analyzes Time & Space complexity automatically." enabled={preferences.complexityAnalysis} onToggle={() => togglePreference('complexityAnalysis')} />
                    <CustomToggle label="Auto Code Review" description="Generate code review upon successful submission." enabled={preferences.autoCodeReview} onToggle={() => togglePreference('autoCodeReview')} />
                    <CustomToggle label="Personalized Recommendations" description="Suggest problems based on weakness." enabled={preferences.personalizedRecs} onToggle={() => togglePreference('personalizedRecs')} />
                  </div>
                </motion.section>

                {/* Notification Preferences */}
                <motion.section variants={itemVariants} className="rounded-2xl border border-white/[0.06] bg-[#121214]/60 backdrop-blur-xl p-8 shadow-xl">
                  <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-yellow-400" /> Notifications
                  </h2>
                  <div className="space-y-2">
                    <CustomToggle label="Daily Practice Reminders" description="Receive emails to keep up your rhythm." enabled={preferences.dailyReminders} onToggle={() => togglePreference('dailyReminders')} />
                    <CustomToggle label="Streak Notifications" description="Alerts when your streak is about to break." enabled={preferences.streakAlerts} onToggle={() => togglePreference('streakAlerts')} />
                    <CustomToggle label="Milestone & Achievements" description="Celebrate when you unlock roadmap nodes." enabled={preferences.milestoneAlerts} onToggle={() => togglePreference('milestoneAlerts')} />
                  </div>
                </motion.section>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sign Out Modal Overlay */}
      <Dialog open={showSignOut} onOpenChange={setShowSignOut}>
        <DialogContent className={cn(
          "w-full max-w-md rounded-3xl border p-8 shadow-2xl text-center z-[9999]",
          isDark ? "bg-[#121214] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
        )}>
          <DialogHeader className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-rose-500" />
            </div>
            <DialogTitle className="text-2xl font-black">Sign Out</DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400 font-medium" : "text-slate-500 font-medium"}>
              Are you sure you want to sign out? Your current session data will be saved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row items-center gap-3 mt-6 sm:justify-center">
            <button 
              onClick={() => setShowSignOut(false)}
              className={cn(
                "flex-1 py-3 px-4 font-bold rounded-xl transition-colors",
                isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              )}
            >
              Cancel
            </button>
            <button 
              onClick={() => { void logout().then(() => navigateTo({ to: '/auth/login' })) }}
              className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 transition-colors"
            >
              Sign Out
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
