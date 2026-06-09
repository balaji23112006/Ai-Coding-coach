import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  icon?: ReactNode;
  label: string;
  labelAction?: ReactNode;
};

function InputField({
  error,
  icon,
  id,
  label,
  labelAction,
  className = '',
  ...props
}: InputFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  const isPassword = props.type === 'password';
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-slate-200/90" htmlFor={inputId}>
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 text-slate-500">
            {icon}
          </span>
        ) : null}
        <input
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`auth-input min-h-12 w-full rounded-xl border bg-white px-4 text-sm text-slate-950 caret-slate-950 shadow-inner shadow-black/10 outline-none transition-all duration-200 placeholder:text-slate-500 focus:bg-white focus:ring-4 ${
            icon ? 'pl-11' : ''
          } ${
            isPassword ? 'pr-12' : ''
          } ${
            error
              ? 'border-rose-400/70 focus:border-rose-300 focus:ring-rose-500/15'
              : 'border-white/[0.08] focus:border-cyan-300/80 focus:ring-cyan-400/15'
          } ${className}`}
          id={inputId}
          {...props}
          type={isPassword && isPasswordVisible ? 'text' : props.type}
        />
        {isPassword ? (
          <button
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-slate-500 transition hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
            onClick={() => setIsPasswordVisible((current) => !current)}
            type="button"
          >
            {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm font-medium text-rose-300" id={`${inputId}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default InputField;
