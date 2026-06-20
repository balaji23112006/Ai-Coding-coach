import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionCard({ title, children, className, contentClassName }: SectionCardProps) {
  return (
    <Card className={cn('border-white/[0.06] bg-slate-950/60 backdrop-blur-xl', className)}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(title ? 'pt-0' : 'p-4', contentClassName)}>{children}</CardContent>
    </Card>
  );
}
