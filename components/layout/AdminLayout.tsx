import Sidebar from "./Sidebar"

type AdminLayoutProps = {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border px-8 flex items-center justify-end">
          {/* Espacio reservado para futuro:
              - Usuario logueado
              - Avatar
              - Botón logout
          */}
        </header>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
