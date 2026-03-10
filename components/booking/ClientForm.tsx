import { Mail, Phone, UserRound } from "lucide-react"
import Input from "@/components/ui/Input"

type ClientFormProps = {
  name: string
  phone: string
  email: string
  onNameChange: (value: string) => void
  onPhoneChange: (value: string) => void
  onEmailChange: (value: string) => void
  phoneError?: string
  emailError?: string
  onPhoneBlur?: () => void
  onEmailBlur?: () => void
}

export default function ClientForm({
  name,
  phone,
  email,
  onNameChange,
  onPhoneChange,
  onEmailChange,
  phoneError,
  emailError,
  onPhoneBlur,
  onEmailBlur,
}: ClientFormProps) {
  return (
    <section>
      <div className="mb-3.5 flex items-center gap-2 text-muted-foreground">
        <UserRound size={16} />
        <p className="text-xs font-semibold uppercase tracking-wider">Tus datos</p>
      </div>

      <div className="space-y-3">
        <Field icon={<UserRound size={16} />} label="Nombre completo">
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            autoComplete="name"
            placeholder="Tu nombre completo"
          />
        </Field>

        <Field icon={<Phone size={16} />} label="Telefono">
          <div className="flex h-12 items-center gap-2 rounded-xl border border-border bg-input px-2">
            <div className="flex h-9 min-w-0 flex-1 items-center border-0 px-3 shadow-none">
              <span className="text-sm font-semibold text-foreground">+54</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                onBlur={onPhoneBlur}
                placeholder="11 1234 5678"
                className="h-full w-full appearance-none border-0 bg-transparent pl-2 text-sm font-medium text-foreground outline-none ring-0 shadow-none focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none placeholder:text-muted"
                style={{ border: "none", boxShadow: "none" }}
              />
            </div>
          </div>
          {phoneError ? <p className="mt-1 text-[12px] font-medium text-red-300">{phoneError}</p> : null}
        </Field>

        <Field icon={<Mail size={16} />} label="Email">
          <Input
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            onBlur={onEmailBlur}
            autoComplete="email"
            placeholder="tucorreo@gmail.com"
          />
          {emailError ? <p className="mt-1 text-[12px] font-medium text-red-300">{emailError}</p> : null}
        </Field>
      </div>
    </section>
  )
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  )
}
