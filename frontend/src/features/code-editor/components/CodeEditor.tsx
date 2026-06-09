import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import type { SupportedLanguage } from '../types/editor.types';

// Enforce local monaco-editor bundle loading (fully offline compatible)
loader.config({ monaco });

interface CodeEditorProps {
  language: SupportedLanguage;
  value: string;
  onChange: (value: string) => void;
}

export function CodeEditor({ language, value, onChange }: CodeEditorProps) {
  // Map our language keys to Monaco editor supported languages
  const monacoLanguages: Record<SupportedLanguage, string> = {
    javascript: 'javascript',
    typescript: 'typescript',
    python: 'python',
    java: 'java',
    cpp: 'cpp',
  };

  const handleEditorChange = (val: string | undefined) => {
    onChange(val ?? '');
  };

  const fileExtensions: Record<SupportedLanguage, string> = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    java: 'java',
    cpp: 'cpp',
  };

  return (
    <div className="relative flex-grow flex-1 w-full overflow-hidden rounded-xl border border-white/[0.06] bg-[#1e1e1e] flex flex-col min-h-0">
      {/* Editor Header Overlay */}
      <div className="flex h-9 items-center justify-between border-b border-white/[0.05] bg-slate-950/60 px-4 editor-header flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="ml-3 font-mono text-[10px] tracking-wider text-slate-500 uppercase">
            source_file.{fileExtensions[language]}
          </span>
        </div>
      </div>

      {/* Monaco Editor component */}
      <div className="flex-grow flex-1 w-full relative min-h-0 editor-body">
        <Editor
          height="100%"
          language={monacoLanguages[language]}
          value={value}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            minimap: { enabled: false },
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
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
  );
}
