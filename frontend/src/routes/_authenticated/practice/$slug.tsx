import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Editor from '@monaco-editor/react'
import { Play, Check, ArrowLeft, Bot, Send, X, Terminal, Code2, AlertCircle, Sun, Moon } from 'lucide-react'
import { apiClient } from '@/services/api-client'
import { useAuth } from '@/features/authentication'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/practice/$slug')({
  component: ProblemWorkspacePage,
})

interface TestCase {
  id: string
  input: string
  expected_output: string
  is_hidden: boolean
}

interface QuestionDetails {
  id: string
  slug: string
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  description: string
  constraints: string[]
  starter_code: Record<string, string>
  topics: string[]
  test_cases: TestCase[]
}

function ProblemWorkspacePage() {
  const { slug } = useParams({ from: '/_authenticated/practice/$slug' })
  const { user } = useAuth()
  const [isDark, setIsDark] = useState(true)
  const [question, setQuestion] = useState<QuestionDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState<'javascript' | 'python'>('javascript')
  const [code, setCode] = useState('')
  const [tab, setTab] = useState<'description' | 'testcases'>('description')
  const [consoleTab, setConsoleTab] = useState<'logs' | 'results'>('logs')
  const [consoleOpen, setConsoleOpen] = useState(true)
  
  // Execution status states
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [execResult, setExecResult] = useState<any>(null)
  const [submitResult, setSubmitResult] = useState<any>(null)
  
  // AI Chat helper states
  const [aiOpen, setAiOpen] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [aiMessages, setAiMessages] = useState<{role: 'bot' | 'user', text: string}[]>([
    { role: 'bot', text: 'Hi! I am your AI Coding Coach. Struggling with logic, syntax, or edge cases? Ask me for a conceptual hint, and I will help you work through it without spoiling the answer!' }
  ])
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    apiClient.get<QuestionDetails>(`/questions/${slug}`)
      .then(res => {
        setQuestion(res)
        // Preload starter code
        const defaultCode = res.starter_code?.[language] || res.starter_code?.['javascript'] || ''
        setCode(defaultCode)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch question details:', err)
        setLoading(false)
      })
  }, [slug])

  // Update starter code when language switches
  const handleLanguageChange = (newLang: 'javascript' | 'python') => {
    setLanguage(newLang)
    if (question?.starter_code?.[newLang]) {
      setCode(question.starter_code[newLang])
    }
  };

  // Run Code
  const handleRun = async () => {
    if (!question) return
    setIsRunning(true)
    setConsoleOpen(true)
    setConsoleTab('logs')
    setExecResult(null)
    setSubmitResult(null)

    try {
      const res = await apiClient.post<any>('/run', {
        language,
        sourceCode: code
      })
      setExecResult(res)
    } catch (err: any) {
      setExecResult({
        success: false,
        status: 'FAILED',
        stderr: err.message || 'Error executing code'
      })
    } finally {
      setIsRunning(false)
    }
  }

  // Submit Code
  const handleSubmit = async () => {
    if (!question) return
    setIsSubmitting(true)
    setConsoleOpen(true)
    setConsoleTab('results')
    setSubmitResult(null)
    setExecResult(null)

    try {
      const res = await apiClient.post<any>('/submit', {
        language,
        sourceCode: code,
        questionId: question.id,
        userId: user?.id
      })
      setSubmitResult(res)
    } catch (err: any) {
      setSubmitResult({
        status: 'FAILED',
        error: err.message || 'Submission failed'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Send AI Mentor Message
  const handleSendAi = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiInput.trim() || aiLoading || !question) return

    const userText = aiInput.trim()
    const updatedMessages = [...aiMessages, { role: 'user' as const, text: userText }]
    setAiMessages(updatedMessages)
    setAiInput('')
    setAiLoading(true)

    // Capture context
    let errorOutput = ''
    if (submitResult) {
      errorOutput = `Submission status: ${submitResult.status}\nStdout: ${submitResult.stdout || ''}\nStderr: ${submitResult.stderr || ''}`
    } else if (execResult) {
      errorOutput = `Execution status: ${execResult.status}\nStdout: ${execResult.stdout || ''}\nStderr: ${execResult.stderr || ''}`
    }

    try {
      const res = await apiClient.post<{ reply: string }>('/mentor/chat', {
        messages: updatedMessages,
        questionTitle: question.title,
        questionDescription: question.description,
        userCode: code,
        errorOutput
      })
      setAiMessages(prev => [...prev, { role: 'bot', text: res.reply }])
    } catch (err) {
      setAiMessages(prev => [...prev, { role: 'bot', text: "I'm having trouble thinking of a hint right now. Try checking your syntax or logic first!" }])
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#171033] via-[#09090b] to-[#050505] text-slate-100">
        <div className="h-12 w-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
        <p className="mt-6 text-sm font-bold uppercase tracking-widest text-violet-400 animate-pulse">Prewarming environment...</p>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6">
        <AlertCircle className="h-16 w-16 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-black">Challenge Not Found</h2>
        <p className="text-slate-400 mt-2">The problem workspace could not be fetched.</p>
        <Link to="/practice" className="mt-6">
          <Button className="bg-violet-600 hover:bg-violet-500 rounded-full font-bold">Return to Hub</Button>
        </Link>
      </div>
    )
  }

  const themeClass = isDark 
    ? 'dark bg-[#08060f] text-slate-100' 
    : 'bg-slate-50 text-slate-900'

  return (
    <div className={cn("min-h-screen flex flex-col font-sans antialiased overflow-hidden", themeClass)}>
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 right-1/3 w-80 h-80 bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className={cn("flex h-14 items-center justify-between px-6 border-b backdrop-blur-xl z-20 shrink-0", isDark ? "border-white/[0.04] bg-[#09090b]/80" : "border-slate-200 bg-white shadow-sm")}>
        <div className="flex items-center gap-4">
          <Link to="/practice">
            <button className={cn("flex h-8 w-8 items-center justify-center rounded-full border transition", isDark ? "border-white/[0.06] text-slate-400 hover:bg-white/[0.05] hover:text-white" : "border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900")} title="Back to Challenge Hub">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div className="h-4 w-px bg-white/[0.08]" />
          <span className="text-sm font-black tracking-tight">{question.title}</span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setIsDark(!isDark)} className={cn("p-2 rounded-full transition", isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-slate-600 hover:bg-black/5 hover:text-slate-900")}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button onClick={() => setAiOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-950/40">
            <Bot className="h-3.5 w-3.5" /> AI Mentor
          </button>
        </div>
      </header>

      {/* Workspace Split Panes */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* Left Pane: Problem Details */}
        <div className={cn("w-1/2 flex flex-col border-r min-w-[320px] overflow-hidden", isDark ? "border-white/[0.04]" : "border-slate-200")}>
          <div className="flex border-b border-white/[0.04] px-4 py-2 shrink-0 bg-black/10">
            <button
              onClick={() => setTab('description')}
              className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", 
                tab === 'description'
                  ? "bg-violet-500/10 text-violet-400 border border-violet-500/30"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Description
            </button>
            <button
              onClick={() => setTab('testcases')}
              className={cn("ml-2 px-4 py-1.5 text-xs font-bold rounded-lg transition-all", 
                tab === 'testcases'
                  ? "bg-violet-500/10 text-violet-400 border border-violet-500/30"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Test Cases
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {tab === 'description' ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border", 
                      question.difficulty === 'Easy' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
                      question.difficulty === 'Medium' ? 'text-amber-400 border-amber-500/20 bg-amber-500/5' :
                      'text-rose-400 border-rose-500/20 bg-rose-500/5'
                    )}>
                      {question.difficulty}
                    </span>
                    {question.topics.map(t => (
                      <span key={t} className="text-[10px] font-bold uppercase tracking-wider bg-white/[0.03] text-slate-400 border border-white/5 px-2 py-1 rounded-md">
                        {t}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-3xl font-black mt-4 tracking-tight">{question.title}</h2>
                </div>

                <div className="prose prose-invert max-w-none text-sm text-slate-300 font-medium leading-relaxed space-y-4">
                  {question.description.split('\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>

                {/* Constraints */}
                {question.constraints && question.constraints.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Constraints</h4>
                    <ul className="list-disc pl-5 text-sm text-slate-400 font-medium space-y-1.5">
                      {question.constraints.map((c, i) => (
                        <li key={i} className="font-mono text-xs">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-lg font-bold">Standard Test Cases</h3>
                <div className="space-y-4">
                  {question.test_cases.filter(tc => !tc.is_hidden).map((tc, idx) => (
                    <div key={tc.id} className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] font-mono text-xs space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Test Case {idx + 1}</div>
                      <div>
                        <span className="text-slate-500">Input:</span> <span className="text-slate-300">{tc.input}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Expected Output:</span> <span className="text-emerald-400">{tc.expected_output}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Monaco Editor & Output Console */}
        <div className="flex-1 flex flex-col min-w-[320px] overflow-hidden">
          
          {/* Editor Controls */}
          <div className={cn("flex items-center justify-between border-b px-4 py-2 shrink-0 bg-black/10", isDark ? "border-white/[0.04]" : "border-slate-200")}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1">
                <Code2 className="h-3.5 w-3.5" /> Language:
              </span>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as any)}
                className="bg-[#121214] text-xs font-bold border border-white/10 rounded-lg px-2.5 py-1 outline-none text-slate-300 focus:border-violet-500"
              >
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="python">Python (3.10)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleRun}
                disabled={isRunning || isSubmitting}
                variant="outline"
                className="border-white/10 bg-white/5 hover:bg-white/10 hover:text-white rounded-full text-xs font-semibold h-8 px-4 gap-1.5"
              >
                <Play className="h-3 w-3 fill-current" /> Run Code
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isRunning || isSubmitting}
                className="bg-violet-600 hover:bg-violet-500 text-white rounded-full text-xs font-bold h-8 px-4 gap-1.5 shadow-md shadow-violet-950/40"
              >
                <Check className="h-3 w-3" /> Submit
              </Button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-0 relative bg-[#1e1e1e]">
            <Editor
              height="100%"
              language={language === 'javascript' ? 'javascript' : 'python'}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                fontSize: 13,
                fontFamily: 'Fira Code, monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>

          {/* Console Drawer */}
          <div className={cn("border-t flex flex-col transition-all duration-300 relative", 
            isDark ? "border-white/[0.04] bg-[#0c0916]" : "border-slate-200 bg-slate-100",
            consoleOpen ? "h-64" : "h-10"
          )}>
            <div className="flex items-center justify-between px-6 py-2 shrink-0 border-b border-white/[0.04] bg-black/10 select-none">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConsoleOpen(!consoleOpen)}
                  className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-1.5"
                >
                  <Terminal className="h-3.5 w-3.5" /> Output Console
                </button>
                {consoleOpen && (
                  <>
                    <div className="h-3.5 w-px bg-white/[0.08]" />
                    <button
                      onClick={() => setConsoleTab('logs')}
                      className={cn("text-xs font-semibold transition", 
                        consoleTab === 'logs' ? "text-violet-400" : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      Test Run
                    </button>
                    <button
                      onClick={() => setConsoleTab('results')}
                      className={cn("ml-3 text-xs font-semibold transition", 
                        consoleTab === 'results' ? "text-violet-400" : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      Submission
                    </button>
                  </>
                )}
              </div>
              
              <button 
                onClick={() => setConsoleOpen(!consoleOpen)}
                className="text-xs font-bold text-slate-500 hover:text-white"
              >
                {consoleOpen ? 'Minimize' : 'Open'}
              </button>
            </div>

            {/* Console Content */}
            {consoleOpen && (
              <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-3 bg-[#0d0d0f] text-slate-300">
                {consoleTab === 'logs' ? (
                  isRunning ? (
                    <div className="flex items-center gap-2 text-slate-500 animate-pulse">
                      <div className="h-2 w-2 rounded-full bg-slate-500 animate-ping" />
                      Running code in isolated sandbox...
                    </div>
                  ) : execResult ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-white/[0.02] p-2 rounded-lg border border-white/5">
                        <span>Status: <span className={cn("font-bold", execResult.success ? "text-emerald-400" : "text-rose-400")}>{execResult.status}</span></span>
                        {execResult.executionTime !== undefined && <span>{execResult.executionTime} ms</span>}
                      </div>
                      {execResult.stdout && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stdout</div>
                          <pre className="bg-black/40 p-3 rounded-lg border border-white/[0.03] overflow-x-auto whitespace-pre-wrap">{execResult.stdout}</pre>
                        </div>
                      )}
                      {execResult.stderr && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-rose-500/70 uppercase tracking-widest">Stderr</div>
                          <pre className="bg-rose-950/20 border border-rose-500/10 p-3 rounded-lg text-rose-300 overflow-x-auto whitespace-pre-wrap">{execResult.stderr}</pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-600">Run code to see stdout/stderr logs here.</div>
                  )
                ) : (
                  isSubmitting ? (
                    <div className="flex items-center gap-2 text-slate-500 animate-pulse">
                      <div className="h-2 w-2 rounded-full bg-slate-500 animate-ping" />
                      Evaluating correctness against hidden test cases...
                    </div>
                  ) : submitResult ? (
                    <div className="space-y-2">
                      <div className={cn("flex justify-between items-center p-3 rounded-lg border", 
                        submitResult.status === 'ACCEPTED' 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      )}>
                        <span className="font-bold tracking-wide">
                          {submitResult.status === 'ACCEPTED' ? '✓ SUCCESS: ACCEPTED' : '✗ FAILED: ' + submitResult.status}
                        </span>
                        {submitResult.executionTime !== undefined && <span className="font-mono text-xs">{submitResult.executionTime} ms</span>}
                      </div>
                      
                      {submitResult.status === 'ACCEPTED' ? (
                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl text-emerald-300 leading-relaxed font-sans font-medium text-sm flex items-start gap-3 mt-4">
                          <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 font-black">✓</div>
                          <div>
                            <p className="font-bold">Fantastic job!</p>
                            <p className="mt-1 text-xs text-slate-400 leading-relaxed">Your implementation successfully passed all structured database test suites and edge cases. Check the Dashboard to review your updated topic mastery rating!</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-rose-500/70 uppercase tracking-widest">Details</div>
                          <pre className="bg-rose-950/20 border border-rose-500/10 p-3 rounded-lg text-rose-300 overflow-x-auto whitespace-pre-wrap">
                            {submitResult.error || 'One or more test cases failed. Ask the AI Mentor for dynamic hints to optimize your solution.'}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-600">Submit code to compile, link, and evaluate against test suites.</div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating AI Mentor Chat Panel */}
      <AnimatePresence>
        {aiOpen && (
          <motion.div
            initial={{ opacity: 0, x: 380 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 380 }}
            transition={{ type: 'spring', damping: 24, stiffness: 150 }}
            className={cn("fixed right-0 top-0 bottom-0 w-80 sm:w-96 shadow-2xl z-40 border-l flex flex-col backdrop-blur-2xl", 
              isDark ? "bg-[#110d1c]/95 border-white/[0.08]" : "bg-white/95 border-slate-200"
            )}
          >
            <div className="p-4 border-b border-white/[0.05] flex items-center justify-between bg-black/10 shrink-0 select-none">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-white">
                  <Bot className="h-4 w-4" />
                </span>
                <span className="text-sm font-black tracking-tight">AI Coding Coach</span>
              </div>
              <button 
                onClick={() => setAiOpen(false)} 
                className={cn("p-1 rounded-full transition", isDark ? "text-slate-400 hover:bg-white/[0.05] hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Message window */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col min-h-0">
              {aiMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-semibold leading-relaxed font-sans shadow-sm", 
                    msg.role === 'user'
                      ? "self-end bg-violet-600 text-white rounded-br-sm shadow-violet-950/20"
                      : cn(isDark ? "self-start bg-white/[0.04] border border-white/[0.04] text-slate-200 rounded-bl-sm" : "self-start bg-slate-100 text-slate-800 rounded-bl-sm")
                  )}
                >
                  {msg.text}
                </div>
              ))}
              {aiLoading && (
                <div className="self-start max-w-[85%] bg-white/[0.04] border border-white/[0.04] rounded-2xl px-4 py-2.5 rounded-bl-sm flex items-center gap-2 text-slate-500 animate-pulse font-sans font-semibold text-xs">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>

            {/* Input form */}
            <form onSubmit={handleSendAi} className={cn("p-3 border-t flex gap-2 items-center bg-black/10 shrink-0", isDark ? "border-white/[0.05]" : "border-slate-100")}>
              <input
                type="text"
                placeholder="Ask about logic, complexity, edge cases..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                className="flex-1 bg-transparent text-xs font-semibold outline-none px-3 py-2 border border-white/5 rounded-xl placeholder:text-slate-600"
              />
              <button 
                type="submit" 
                disabled={!aiInput.trim() || aiLoading} 
                className="h-8 w-8 flex items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 transition shadow-md shadow-violet-950/40"
              >
                <Send className="h-3.5 w-3.5 ml-0.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  )
}
