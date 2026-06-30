import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, RefreshCw, Map, Maximize2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AiRoadmapPanelProps {
  isDark?: boolean;
}

export function AiRoadmapPanel({ isDark = false }: AiRoadmapPanelProps) {
  const [roadmapMarkdown, setRoadmapMarkdown] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoadmap = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/problem-recommendation/roadmap");
      const json = await res.json();
      if (json.success && json.data.roadmap) {
        setRoadmapMarkdown(json.data.roadmap);
      } else {
        setRoadmapMarkdown(null);
      }
    } catch (err) {
      console.error("Failed to fetch AI roadmap:", err);
      setError("Failed to load your AI roadmap.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/problem-recommendation/run-background", {
        method: "POST",
      });
      if (res.ok) {
        // Poll for completion
        const interval = setInterval(async () => {
          const checkRes = await fetch("/api/ai/problem-recommendation/roadmap");
          const checkJson = await checkRes.json();
          if (checkJson.success && checkJson.data.roadmap) {
            setRoadmapMarkdown(checkJson.data.roadmap);
            setIsGenerating(false);
            clearInterval(interval);
          }
        }, 3000);

        // Timeout after 30 seconds
        setTimeout(() => {
          clearInterval(interval);
          if (isGenerating) {
            setIsGenerating(false);
            setError("Roadmap generation timed out. Please try again.");
          }
        }, 30000);
      } else {
        throw new Error("Generation request failed");
      }
    } catch (err) {
      console.error("Failed to generate AI roadmap:", err);
      setError("Failed to generate your AI roadmap.");
      setIsGenerating(false);
    }
  };

  const panelClass = isDark
    ? "rounded-2xl border border-white/[0.06] bg-[#120d20]/80 backdrop-blur-xl shadow-xl text-slate-200"
    : "rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xl text-slate-800";

  return (
    <div className={cn("p-6 w-full flex flex-col gap-4", panelClass)}>
      <div className="flex justify-between items-center border-b border-slate-700/50 pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Map className="w-5 h-5 text-violet-400" />
          Your AI Learning Path
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating || isLoading}
          className={cn(
            "gap-2",
            isDark ? "border-slate-700 hover:bg-slate-800 text-slate-300" : ""
          )}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {roadmapMarkdown ? "Regenerate" : "Generate Roadmap"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[200px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            <p className="text-sm font-medium">Loading your AI roadmap...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-red-400">
            <p>{error}</p>
            <Button variant="link" onClick={fetchRoadmap} className="text-violet-400">
              Try again
            </Button>
          </div>
        ) : isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-70">
            <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
            <div className="text-center">
              <p className="font-semibold text-violet-300">Analyzing your profile...</p>
              <p className="text-sm opacity-70 mt-1">Our AI coach is crafting a personalized roadmap based on your weakest topics.</p>
            </div>
          </div>
        ) : roadmapMarkdown ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-90 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-emerald-400">Roadmap Generated!</h3>
            <p className="text-sm opacity-80 max-w-[280px]">
              Your personalized AI learning path has been crafted based on your recent performance.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="mt-4 bg-violet-600 hover:bg-violet-700 text-white gap-2 font-bold shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                  <Maximize2 className="w-4 h-4" />
                  View Detailed Roadmap
                </Button>
              </DialogTrigger>
              <DialogContent className={cn("max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0", isDark ? "bg-[#120d20] border-slate-700 text-slate-200" : "bg-white text-slate-800")}>
                <DialogHeader className="p-6 pb-4 border-b border-slate-800/50 bg-slate-900/50">
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    <Map className="w-6 h-6 text-violet-400" />
                    Personalized AI Roadmap
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-900/50">
                  {(() => {
                    let phases = [];
                    try {
                      // LLM might include text before or after the JSON.
                      // Find the first '[' and the last ']' to extract the array.
                      const startIndex = roadmapMarkdown.indexOf('[');
                      const endIndex = roadmapMarkdown.lastIndexOf(']');
                      
                      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                        const jsonStr = roadmapMarkdown.substring(startIndex, endIndex + 1);
                        phases = JSON.parse(jsonStr);
                      } else {
                        // Try parsing the whole thing if brackets aren't found
                        const clean = roadmapMarkdown.replace(/```json/gi, '').replace(/```/g, '').trim();
                        phases = JSON.parse(clean);
                      }
                    } catch (e) {
                      console.error("Failed to parse roadmap JSON:", e, roadmapMarkdown);
                      // Fallback if parsing fails
                      return (
                        <div className="prose prose-base dark:prose-invert max-w-none prose-headings:text-violet-400 bg-red-500/10 p-4 border border-red-500/50 rounded-lg">
                          <p className="text-red-400 font-bold mb-4">Note: The AI failed to generate strict JSON. Showing raw output instead.</p>
                          <ReactMarkdown>{roadmapMarkdown}</ReactMarkdown>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-6">
                        {phases.map((phase: any, idx: number) => (
                          <div key={idx} className="relative rounded-2xl border border-white/10 bg-[#1e1736]/60 backdrop-blur-md p-6 shadow-xl transition-all hover:border-violet-500/50">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-2xl shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                                    {phase.emoji}
                                  </span>
                                  <h3 className="text-xl font-bold text-white">
                                    Phase {phase.phaseNumber} <span className="text-violet-400 mx-2">—</span> {phase.title}
                                  </h3>
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed mb-5 border-l-2 border-violet-500/30 pl-4 italic">
                                  {phase.context}
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="rounded-xl bg-black/20 p-4 border border-white/5">
                                    <p className="text-xs font-bold uppercase tracking-wider text-violet-400 mb-1">Focus</p>
                                    <p className="text-slate-200 text-sm">{phase.focus}</p>
                                  </div>
                                  <div className="rounded-xl bg-black/20 p-4 border border-white/5">
                                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1">Review</p>
                                    <p className="text-slate-200 text-sm">{phase.review}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between rounded-xl bg-violet-600/10 border border-violet-500/20 p-4">
                              <div className="flex items-center gap-3 mb-3 sm:mb-0">
                                <div className="bg-violet-600 rounded-lg p-2">
                                  <Map className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-slate-400">Recommended Practice</p>
                                  <p className="font-bold text-white text-lg flex items-center gap-2">
                                    {phase.problemName}
                                    <span className={cn(
                                      "text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border",
                                      phase.difficulty === "Easy" ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" : 
                                      phase.difficulty === "Medium" ? "text-amber-400 border-amber-400/30 bg-amber-400/10" : 
                                      "text-rose-400 border-rose-400/30 bg-rose-400/10"
                                    )}>
                                      {phase.difficulty}
                                    </span>
                                  </p>
                                </div>
                              </div>
                              <Button 
                                onClick={() => {
                                  // Navigate or open editor logic could go here
                                  window.location.href = "/practice";
                                }}
                                className="w-full sm:w-auto bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-lg shadow-violet-500/25 transition-all hover:scale-105"
                              >
                                Solve Problem
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-70 text-center px-4">
            <Map className="w-12 h-12 text-slate-500 mb-2 opacity-50" />
            <p className="font-semibold">No active roadmap found.</p>
            <p className="text-sm opacity-80 max-w-[250px]">
              Generate a custom AI roadmap tailored to your specific weaknesses and coding style.
            </p>
            <Button onClick={handleGenerate} className="mt-2 bg-violet-600 hover:bg-violet-700 text-white">
              Generate Now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
