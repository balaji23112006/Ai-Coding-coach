import type { ReactNode } from 'react';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger';

const toneToVariant: Record<StatusTone, BadgeProps['variant']> = {
  neutral: 'secondary',
  success: 'outline',
  warning: 'outline',
  danger: 'destructive',
};

const toneClasses: Record<StatusTone, string> = {
  neutral: 'border-slate-700 bg-slate-900 text-slate-300',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  danger: 'border-rose-500/20 bg-rose-500/10 text-rose-400',
};

interface StatusBadgeProps {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
}

export function StatusBadge({ children, tone = 'neutral', className }: StatusBadgeProps) {
  return (
    <Badge
      variant={toneToVariant[tone]}
      className={cn(
        'gap-1.5 text-[9px] font-bold uppercase tracking-widest',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </Badge>
  );
}
