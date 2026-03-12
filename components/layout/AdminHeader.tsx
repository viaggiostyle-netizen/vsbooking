"use client"

type AdminHeaderProps = {
  children?: React.ReactNode
}

export default function AdminHeader({ children }: AdminHeaderProps) {
  return (
    <header className="admin-header sticky top-0 z-40 w-full border-b border-surface/70 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-[72px] items-center px-5 lg:px-8">{children}</div>
    </header>
  )
}
