import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SupportedLanguage } from '../types/editor-types';

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
  return (
    <Select
      value={selectedLanguage}
      onValueChange={(value) => onLanguageChange(value as SupportedLanguage)}
    >
      <SelectTrigger
        className="min-h-10 w-40 border-white/[0.08] bg-slate-950/60 text-xs font-semibold text-slate-200 hover:border-cyan-300/40 hover:bg-slate-950/80"
        aria-label="Select editor language"
      >
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent className="border-white/[0.08] bg-slate-950 text-slate-200">
        {(Object.keys(LANGUAGES) as SupportedLanguage[]).map((lang) => (
          <SelectItem key={lang} value={lang}>
            {LANGUAGES[lang]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
