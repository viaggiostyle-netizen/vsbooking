import { Mail, Search } from "lucide-react"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"

type BookingSearchProps = {
  email: string
  onEmailChange: (value: string) => void
  onSearch: () => void
}

export default function BookingSearch({ email, onEmailChange, onSearch }: BookingSearchProps) {
  return (
    <div className="animate-apple-in space-y-4">
      <div className="relative group">
        <label className="mb-2 block text-[13px] font-bold uppercase tracking-wider text-muted/80 ml-1">
          Tu correo electrónico
        </label>
        <div className="relative">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted/60 transition-colors group-focus-within:text-foreground">
            <Mail size={18} />
          </div>
          <Input
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="ejemplo@correo.com"
            className="h-[54px] w-full rounded-2xl border-border/50 bg-background !pl-[74px] pr-4 text-[16px] text-foreground placeholder:text-muted/40 transition-all focus:border-foreground/20 focus:ring-4 focus:ring-foreground/[0.03]"
          />
        </div>
      </div>

      <Button 
        onClick={onSearch} 
        disabled={!email || !email.includes("@")}
        className="h-[54px] w-full items-center gap-4 rounded-2xl bg-foreground text-[16px] font-bold text-background shadow-lg shadow-foreground/10 hover:shadow-foreground/20 active:scale-[0.98]"
      >
        <Search size={18} />
        Buscar mi reserva
      </Button>
    </div>
  )
}
