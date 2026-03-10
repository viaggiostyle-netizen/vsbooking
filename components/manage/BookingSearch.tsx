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
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 flex items-center gap-2 text-[14px] font-semibold text-foreground">
          <Mail size={16} className="text-muted" />
          Email
        </label>
        <Input
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="tucorreo@gmail.com"
          className="h-[46px] rounded-[14px] border-border bg-input px-3 text-[15px] text-foreground placeholder:text-muted focus:border-foreground"
        />
      </div>

      <Button onClick={onSearch} className="h-[48px] w-full rounded-[12px] py-3 text-[15px] font-[600]">
        <Search size={16} />
        Buscar reserva
      </Button>
    </div>
  )
}
