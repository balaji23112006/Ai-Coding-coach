import type { InputHTMLAttributes, ReactNode } from 'react';

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
          className={`bg-slate-950/68 focus:bg-slate-950/82 min-h-12 w-full rounded-xl border px-4 text-sm text-white shadow-inner shadow-black/20 outline-none transition-all duration-200 placeholder:text-slate-500 focus:ring-4 ${
            icon ? 'pl-11' : ''
          } ${
            error
              ? 'border-rose-400/70 focus:border-rose-300 focus:ring-rose-500/15'
              : 'border-white/[0.08] focus:border-cyan-300/80 focus:ring-cyan-400/15'
          } ${className}`}
          id={inputId}
          {...props}
        />
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
