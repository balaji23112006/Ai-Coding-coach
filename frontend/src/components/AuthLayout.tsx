import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import backgroundPhoto from '../premium_photo-1661877737564-3dfd7282efcb.avif';

type AuthLayoutProps = {
  children: ReactNode;
};

type FAQItem = {
  question: string;
  answer: string;
};

function AuthLayout({ children }: AuthLayoutProps) {
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const faqData: FAQItem[] = [
    { question: "Is Skill Lens free to use?", answer: "We offer a robust free tier that includes 50 AI code reviews per month. Premium tiers unlock unlimited active tracking and deep architectural pattern analysis." },
    { question: "Are inline hints available during practice?", answer: "Yes. The AI companion analyzes your logical structure in real-time and provides subtle, non-blocking algorithmic hints without exposing the direct solution." },
    { question: "Which programming languages are supported?", answer: "Out of the box, we fully support TypeScript, JavaScript, Python, Go, Rust, C++, and Java with language-specific syntax models." },
    { question: "Can I connect this to my local IDE setup?", answer: "Absolutely. Skill Lens seamlessly pairs with our official VS Code and JetBrains extensions to analyze code natively as you type." },
    { question: "How does the 'Signal' logic metric work?", answer: "Our custom static-analysis models evaluate your space/time complexity metrics ($O(n)$ footprint) alongside state transitions to compute an overall structural clarity score." },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFaqOpen(false);
        setExpandedIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { 
        staggerChildren: 0.28,  
        delayChildren: 0.4      
      }
    }
  };

  const premiumFadeInItem: Variants = {
    hidden: { opacity: 0, y: 25 }, 
    visible: {
      opacity: 1,
      y: 0,
      transition: { 
        duration: 1.1,           
        ease: [0.215, 0.610, 0.355, 1.000] 
      }
    }
  };

  const dropdownVariants: Variants = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
    },
    exit: { 
      opacity: 0, 
      y: 8, 
      scale: 0.95,
      transition: { duration: 0.2, ease: "easeInOut" }
    }
  };

  return (
    <main className="relative min-h-screen bg-[#050508] text-white antialiased">
      {/* Dynamic Keyframes */}
      <style>{`
        @keyframes blink { 50% { border-color: transparent } }
        @keyframes typeText { 
          0%, 90%, 100% { width: 0; } 
          30%, 70% { width: 8.3em; } 
        }
        .animate-premium-cursor { animation: blink 0.8s step-end infinite; }
        .animate-infinite-typing { animation: typeText 7.5s steps(10, end) infinite; }
      `}</style>

      {/* Background Layer */}
      <motion.img
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.45 }}
        transition={{ duration: 2.2, ease: "easeOut" }}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover mix-blend-screen saturate-100"
        src={backgroundPhoto}
      />

      {/* Ambient Lighting & Mesh */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,_rgba(5,5,8,0.99)_0%,_rgba(5,5,8,0.88)_45%,_rgba(5,5,8,0.97)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,_rgba(34,211,238,0.12),_transparent_40%),radial-gradient(circle_at_80%_75%,_rgba(168,85,247,0.12),_transparent_40%)]" />
      <div 
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,_transparent_1px),linear-gradient(90deg,_rgba(255,255,255,0.012)_1px,_transparent_1px)] bg-[size:40px_40px] opacity-40"
        style={{ maskImage: 'radial-gradient(circle at 50% 50%, black 60%, transparent 100%)', WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 60%, transparent 100%)' }}
      />

      <motion.section 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col justify-between min-h-screen px-6 py-6 sm:px-10 md:px-24"
      >
        {/* ==================== TOP BAR ==================== */}
        <header className="flex items-center justify-between w-full relative z-50">
          <motion.div variants={premiumFadeInItem} className="flex items-center gap-2 cursor-pointer group">
            <div className="h-4 w-4 rounded bg-gradient-to-br from-cyan-400 to-purple-500 opacity-80" />
            <span className="font-mono text-[11px] font-semibold tracking-wider text-slate-500 group-hover:text-white transition-colors">SL // CORE</span>
          </motion.div>

          <motion.nav variants={premiumFadeInItem} className="flex items-center gap-6 relative" ref={dropdownRef}>
            <a href="#docs" className="text-xs font-medium tracking-wide text-slate-400 hover:text-cyan-400 transition-colors">Docs</a>
            
            <button 
              onClick={() => setIsFaqOpen(!isFaqOpen)}
              className={`text-xs font-medium tracking-wide flex items-center gap-1 transition-colors ${isFaqOpen ? 'text-cyan-400' : 'text-slate-400 hover:text-cyan-400'}`}
            >
              FAQ
              <span className={`text-[9px] transition-transform duration-200 ${isFaqOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            <a href="#status" className="flex items-center gap-2 text-xs font-medium tracking-wide text-slate-400 hover:text-white transition-colors">
              <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
              System Active
            </a>

            {/* FAQ Dropdown Popover */}
            <AnimatePresence>
              {isFaqOpen && (
                <motion.div 
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute right-24 top-8 w-80 sm:w-96 rounded-2xl border border-white/[0.08] bg-slate-950/90 p-3 shadow-2xl shadow-black/80 backdrop-blur-3xl overflow-hidden max-h-[60vh] overflow-y-auto scrollbar-none"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pb-2 border-b border-white/[0.04] mb-2 font-sans">
                    Frequently Asked Questions
                  </p>
                  <div className="space-y-1">
                    {faqData.map((faq, index) => (
                      <div key={index} className="rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                          className="flex items-center justify-between w-full p-2.5 text-left text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.03] transition-colors rounded-lg"
                        >
                          <span className="font-sans pr-2">{faq.question}</span>
                          <span className={`text-[9px] text-slate-500 transition-transform ${expandedIndex === index ? 'rotate-180 text-cyan-400' : ''}`}>
                            ▼
                          </span>
                        </button>
                        <AnimatePresence initial={false}>
                          {expandedIndex === index && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="px-2.5 pb-2.5 pt-1 text-xs text-slate-400 leading-relaxed font-sans border-b border-white/[0.02]">
                                {faq.answer}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.nav>
        </header>

        {/* ==================== MAIN BODY ==================== */}
        <div className="grid grid-cols-1 items-center gap-12 py-12 md:py-20 md:grid-cols-[1.15fr_0.85fr] md:gap-16 w-full">
          
          {/* LEFT SIDE BRANDING */}
          <div className="w-full max-w-2xl space-y-10">
            <motion.div variants={premiumFadeInItem} className="space-y-5">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-400/90 font-sans">
                Next-Gen AI Core Architecture
              </p>
              
              <div className="h-24 sm:h-28 flex items-center select-none">
                <h1 
                  className="font-sans text-6xl font-black tracking-tighter sm:text-7xl text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-300 drop-shadow-[0_4px_12px_rgba(34,211,238,0.15)] border-r-[4px] border-cyan-400 pr-2 overflow-hidden whitespace-nowrap animate-infinite-typing animate-premium-cursor"
                  style={{ display: 'inline-block', lineHeight: '1.1' }}
                >
                  SKILL LENS
                </h1>
              </div>
              
              <p className="max-w-md text-base leading-relaxed text-slate-400/90 font-sans">
                Debug patterns, sharpen fundamentals, and turn practice sessions into measurable momentum.
              </p>
            </motion.div>

            {/* Code Showcase Widget */}
            <motion.div 
              variants={premiumFadeInItem}
              className="relative hidden max-w-xl overflow-hidden rounded-2xl border border-white/[0.05] bg-slate-950/15 p-5 shadow-xl backdrop-blur-2xl sm:block"
            >
              <div className="rounded-xl border border-white/[0.06] bg-slate-950/35 p-5 backdrop-blur-2xl">
                <div className="mb-4 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                </div>
                <pre className="font-mono text-xs leading-5 text-slate-400 tracking-normal">
                  <code>
                    <span className="text-purple-400">const</span> <span className="text-cyan-300">session</span> = <span className="text-purple-400">await</span> coach.<span className="text-blue-400">review</span>(code){'\n'}
                    <span className="text-purple-400">if</span> (session.<span className="text-blue-400">patterns</span>.<span className="text-blue-400">has</span>(<span className="text-amber-300">'dp'</span>)) {'{'} {'\n'}
                    {'  '}lens.<span className="text-blue-400">focus</span>(<span className="text-amber-300">'state transitions'</span>){'\n'}
                    {'  '}practice.<span className="text-blue-400">next</span>({'{'} difficulty: <span className="text-amber-300">'adaptive'</span> {'}'}){'\n'}
                    {'}'}
                  </code>
                </pre>
              </div>

              <div className="absolute bottom-7 right-7 w-40 rounded-xl border border-purple-500/20 bg-purple-950/40 p-3 shadow-lg backdrop-blur-3xl">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-purple-300/80">Signal</p>
                <p className="text-2xl font-bold tracking-tight text-white">96%</p>
                <p className="text-[11px] text-purple-200/60">logic clarity</p>
              </div>
            </motion.div>
          </div>

          {/* RIGHT SIDE: AUTH LOGIN CONTAINER ({children}) */}
          <div className="flex items-center justify-center md:justify-end h-full w-full">
            <motion.div variants={premiumFadeInItem} className="w-full">
              {children}
            </motion.div>
          </div>
        </div>

        {/* ==================== FOOTER ==================== */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full pt-4 border-t border-white/[0.03] mt-auto">
          <motion.p variants={premiumFadeInItem} className="text-[10px] text-slate-500 font-sans">
            &copy; {new Date().getFullYear()} Skill Lens AI. All boundaries operational.
          </motion.p>
          <motion.div variants={premiumFadeInItem} className="flex items-center gap-4 text-[10px] text-slate-500">
            <a href="#privacy" className="hover:text-slate-300 transition-colors">Privacy</a>
            <a href="#terms" className="hover:text-slate-300 transition-colors">Terms</a>
            <span className="text-slate-700">|</span>
            <span className="font-mono text-slate-600">v2.4.0</span>
          </motion.div>
        </footer>

      </motion.section>
    </main>
  );
}

export default AuthLayout;