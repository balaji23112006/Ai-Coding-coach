import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  isLoading?: boolean;
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-950/30 hover:-translate-y-0.5 hover:shadow-cyan-400/25 focus-visible:ring-cyan-300/40',
  secondary:
    'border border-white/10 bg-white/5 text-slate-100 shadow-sm hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/10 focus-visible:ring-cyan-300/30',
};

function Button({
  children,
  className = '',
  disabled,
  isLoading = false,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Logging in
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;
