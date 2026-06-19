import Editor from '@monaco-editor/react';
import type { SupportedLanguage } from '../types/editor-types';

interface CodeEditorProps {
  language: SupportedLanguage;
  value: string;
  onChange: (value: string) => void;
}

const FILE_EXTENSIONS: Record<SupportedLanguage, string> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  java: 'java',
  cpp: 'cpp',
};

/** Maps our language keys to Monaco's language identifiers */
const MONACO_LANGUAGE_MAP: Record<SupportedLanguage, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
};

export function CodeEditor({ language, value, onChange }: CodeEditorProps) {
  // Load user editor preferences with safe fallbacks
  const fontSize = parseInt(localStorage.getItem('editor-fontSize') || '14')
  const tabSize = parseInt(localStorage.getItem('editor-tabSize') || '2')
  const wordWrap = localStorage.getItem('skill-lens-wordWrap') !== 'false' ? 'on' : 'off'
  const minimapEnabled = localStorage.getItem('skill-lens-minimap') === 'true'
  const editorThemePreference = localStorage.getItem('editor-theme') || 'VS Code Dark'
  
  // Map customized editor themes to Monaco's standard built-in themes
  const monacoTheme = ['dracula', 'monokai', 'vs code dark', 'github dark'].some(
    (t) => editorThemePreference.toLowerCase().includes(t)
  )
    ? 'vs-dark'
    : 'vs'

  console.log('CodeEditor loaded options:', {
    fontSize,
    tabSize,
    wordWrap,
    minimapEnabled,
    editorThemePreference,
    monacoTheme,
    rawFontSize: localStorage.getItem('editor-fontSize'),
    rawMinimap: localStorage.getItem('skill-lens-minimap'),
  })

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-800/80 bg-[#1e1e1e]">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/10 px-4">
        <div className="flex items-center gap-4">
          <div className="flex h-9 items-center gap-2 border-r border-slate-800/40 bg-slate-950/20 px-3 text-xs font-semibold text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>source_file.{FILE_EXTENSIONS[language]}</span>
          </div>
          
          <div className="hidden lg:flex items-center gap-1.5 text-[9px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/15">
            <span className="h-1 w-1 bg-amber-400 rounded-full animate-ping" />
            <span>Note: Write the whole program template, not just the function body!</span>
          </div>
        </div>
        
        <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
          {language}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={MONACO_LANGUAGE_MAP[language]}
          value={value}
          onChange={(val) => onChange(val ?? '')}
          theme={monacoTheme}
          loading={
            <div className="flex h-full items-center justify-center bg-[#1e1e1e] text-slate-500 text-sm">
              Loading editor...
            </div>
          }
          options={{
            fontSize: fontSize,
            fontFamily: "'Geist Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
            fontLigatures: true,
            lineNumbers: 'on',
            minimap: { enabled: minimapEnabled },
            scrollBeyondLastLine: false,
            wordWrap: wordWrap,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            tabSize: tabSize,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              useShadows: false,
            },
          }}
        />
      </div>
    </div>
  );
}
