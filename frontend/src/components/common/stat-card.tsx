import { SectionCard } from "@/components/common/section-card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  helper?: string
  className?: string
  valueClassName?: string
}

export function StatCard({ label, value, helper, className, valueClassName }: StatCardProps) {
  return (
    <SectionCard className={cn("p-0", className)} contentClassName="p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={cn("mt-1 font-mono text-lg font-semibold text-slate-100", valueClassName)}>
        {value}
      </p>
      {helper && <p className="mt-1 text-[11px] text-slate-500">{helper}</p>}
    </SectionCard>
  )
}
