import { useRef, useEffect, useCallback } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import type { SupportedLanguage } from '../types/editor.types';

// Use locally bundled monaco-editor (no CDN fetch needed)
loader.config({ monaco });

interface CodeEditorProps {
  language: SupportedLanguage;
  value: string;
  onChange: (value: string) => void;
}

const MONACO_LANGUAGES: Record<SupportedLanguage, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
};

const FILE_EXTENSIONS: Record<SupportedLanguage, string> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  java: 'java',
  cpp: 'cpp',
};

export function CodeEditor({ language, value, onChange }: CodeEditorProps) {
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const handleEditorChange = useCallback(
    (val: string | undefined) => {
      onChange(val ?? '');
    },
    [onChange],
  );

  const handleEditorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorInstanceRef.current = editor;
      // Force an initial layout pass after mount
      requestAnimationFrame(() => {
        editor.layout();
      });
    },
    [],
  );

  // ResizeObserver to force Monaco to re-layout whenever the wrapper size changes
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Define custom Nordic Minimalist editor theme
    monaco.editor.defineTheme('nordic-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#070a13', // Deep slate navy to match branding
        'editorLineNumber.foreground': '#475569', // Soft contrast slate-600 line numbers
        'editorLineNumber.activeForeground': '#94a3b8', // active slate-400
        'editor.lineHighlightBackground': '#1e293b12', // subtle cursor line
        'editor.selectionBackground': '#33415555',
      },
    });

    const ro = new ResizeObserver(() => {
      editorInstanceRef.current?.layout();
    });
    ro.observe(wrapper);

    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex flex-col w-full h-full overflow-hidden rounded-xl border border-slate-800/80 bg-[#070a13]">
      {/* Clean, modern tab bar */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/10 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 items-center bg-slate-950/20 px-3 text-xs font-semibold text-slate-300 gap-2 border-r border-slate-800/40">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>source_file.{FILE_EXTENSIONS[language]}</span>
          </div>
        </div>
        <div className="text-[9px] font-mono tracking-widest text-slate-500 uppercase">
          {MONACO_LANGUAGES[language]}
        </div>
      </div>

      {/*
        Editor area — the key trick:
        • The outer div is flex-1 so it fills remaining vertical space.
        • It also sets position:relative so the inner absolute-positioned child
          can derive concrete pixel dimensions from it.
        • The inner div is position:absolute;inset:0, giving Monaco an exact
          width × height in pixels — which is what its canvas renderer needs.
      */}
      <div ref={wrapperRef} className="relative flex-1 min-h-0 overflow-hidden">
        <div className="absolute inset-0">
          <Editor
            width="100%"
            height="100%"
            language={MONACO_LANGUAGES[language]}
            value={value}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            theme="nordic-dark"
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
              minimap: { enabled: false },
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              readOnly: false,
              automaticLayout: false, // we handle layout manually via ResizeObserver
              cursorBlinking: 'blink',
              cursorStyle: 'line',
              tabSize: 4,
              insertSpaces: true,
              autoIndent: 'full',
              suggestOnTriggerCharacters: true,
              scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
            }}
            loading={
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#1e1e1e] text-slate-400">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                <p className="font-mono text-xs tracking-wider">Configuring environment...</p>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
