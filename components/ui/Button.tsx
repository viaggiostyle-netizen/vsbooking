type ButtonProps = {
  children: React.ReactNode
  className?: string
  variant?: "primary" | "ghost" | "danger" | "destructive"
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export default function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? "border border-foreground bg-foreground text-background"
      : variant === "danger" || variant === "destructive"
        ? "bg-[#dc3232] text-[#fafafa]"
        : "border border-border bg-transparent text-foreground hover:bg-card"

  return (
    <button
      className={`
        inline-flex items-center justify-center
        rounded-2xl px-4 py-2 text-sm font-semibold
        transition
        disabled:opacity-60 disabled:cursor-not-allowed
        ${variantClass}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}
