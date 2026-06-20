import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-8 text-center', className)}>
      {Icon && <Icon className="mb-2 h-8 w-8 text-slate-600" />}
      <p className="text-xs font-medium text-slate-500">{title}</p>
      {description && <p className="mt-1 text-[11px] text-slate-600">{description}</p>}
    </div>
  );
}
