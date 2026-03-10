import PublicLayout from "@/components/layout/PublicLayout"
import PublicHydrator from "@/components/layout/PublicHydrator"

export default function PublicRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicLayout>
      <PublicHydrator />
      {children}
    </PublicLayout>
  )
}
