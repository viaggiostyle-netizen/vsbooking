import Container from "@/components/ui/Container"

type MainLayoutProps = {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <Container className="h-16 flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            Barber System
          </h1>
        </Container>
      </header>

      <main className="flex-1 py-10">
        <Container>{children}</Container>
      </main>
    </div>
  )
}
