import { cn } from "@/lib/utils"

type CardProps = {
  children: React.ReactNode
  className?: string
}

export default function Card({ children, className }: CardProps) {
  return (
    <div className={cn("card card-content", className)}>
      {children}
    </div>
  )
}
