import PublicHeader from "@/components/layout/PublicHeader"
import PublicBottomNav from "@/components/layout/PublicBottomNav"

type PublicLayoutProps = {
  children: React.ReactNode
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="app-container bg-background text-foreground">
      <PublicHeader />
      <main className="main-content pb-[calc(84px+env(safe-area-inset-bottom))] pt-14">
        <div className="main-container">{children}</div>
      </main>
      <PublicBottomNav />
      <footer className="footer hidden md:block">&copy; 2026 ViaggioStyle. Todos los derechos reservados.</footer>
    </div>
  )
}
