import { useState, useRef, useEffect } from 'react';
import type { SupportedLanguage } from '../types/editor.types';

interface LanguageSelectorProps {
  selectedLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
}

const LANGUAGES: Record<SupportedLanguage, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
};

export function LanguageSelector({ selectedLanguage, onLanguageChange }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative z-20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex min-h-10 items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-slate-950/60 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:bg-slate-950/80 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
      >
        <span>{LANGUAGES[selectedLanguage]}</span>
        <svg
          className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 origin-top-right rounded-lg border border-white/[0.08] bg-slate-950/95 p-1.5 shadow-2xl ring-1 ring-black ring-opacity-5 backdrop-blur-xl focus:outline-none">
          {(Object.keys(LANGUAGES) as SupportedLanguage[]).map((lang) => (
            <button
              key={lang}
              onClick={() => {
                onLanguageChange(lang);
                setIsOpen(false);
              }}
              className={`flex w-full items-center rounded-md px-3 py-2 text-left text-xs font-medium transition-colors ${
                selectedLanguage === lang
                  ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-cyan-300'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {LANGUAGES[lang]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
