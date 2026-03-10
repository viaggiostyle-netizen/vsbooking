"use client"

type AdminHeaderProps = {
  children?: React.ReactNode
}

export default function AdminHeader({ children }: AdminHeaderProps) {
  return (
    <header className="admin-header sticky top-0 z-40 w-full border-b border-surface">
      <div className="h-[72px] px-5 lg:px-8 flex items-center">{children}</div>
    </header>
  )
}
