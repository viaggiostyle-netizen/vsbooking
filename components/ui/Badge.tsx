import { cn } from "@/lib/utils"

type BadgeProps = {
  children: React.ReactNode
  className?: string
}

export default function Badge({ children, className }: BadgeProps) {
  return (
    <span className={cn("rounded-md border border-surface px-2 py-0.5 text-xs font-medium text-muted", className)}>
      {children}
    </span>
  )
}
