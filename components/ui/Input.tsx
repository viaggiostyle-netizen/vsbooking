import { cn } from "@/lib/utils"

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export default function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "input w-full bg-input text-foreground border border-border text-sm",
        className
      )}
      {...props}
    />
  )
}
