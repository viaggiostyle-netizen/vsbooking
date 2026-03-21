"use client"

import { Calendar, Clock3, Scissors, UserRound, Wallet2 } from "lucide-react"
import Button from "@/components/ui/Button"
import { formatLongDate } from "@/lib/date"
import { formatMoney } from "@/lib/utils"
import type { Appointment } from "@/types/Appointment"

type BookingDetailsProps = {
  appointment: Appointment
  onCancel: () => void
  onModify: () => void
}

export default function BookingDetails({ appointment, onCancel, onModify }: BookingDetailsProps) {
  return (
    <div className="animate-apple-in mx-auto w-full max-w-[520px] space-y-4">
      <div className="glass-card overflow-hidden">
        <div className="border-b border-border/50 bg-foreground/[0.02] px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold tracking-tight text-foreground">Tu reserva</h3>
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-500 ring-1 ring-inset ring-emerald-500/20">
              Confirmada
            </span>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <InfoItem icon={<UserRound size={18} />} label="Cliente" value={appointment.clientName} />
            <InfoItem icon={<Scissors size={18} />} label="Servicio" value={appointment.service} />
            <InfoItem icon={<Calendar size={18} />} label="Fecha" value={capitalize(formatLongDate(appointment.date))} />
            <InfoItem icon={<Clock3 size={18} />} label="Hora" value={appointment.time} />
          </div>

          <div className="mt-2 border-t border-border/50 pt-6">
            <div className="flex items-center justify-between rounded-2xl bg-foreground/[0.03] p-4 ring-1 ring-border/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-border/50">
                  <Wallet2 size={20} className="text-muted" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted/80">Total a pagar</p>
                  <p className="text-[20px] font-bold leading-none text-foreground">{formatMoney(appointment.finalPrice)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="h-12 w-full rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500/20 border-border/0 font-bold tracking-tight"
        >
          Cancelar cita
        </Button>
        <Button
          onClick={onModify}
          className="h-12 w-full rounded-2xl bg-foreground text-background shadow-lg shadow-foreground/10 hover:shadow-foreground/20 font-bold tracking-tight"
        >
          Reprogramar
        </Button>
      </div>
    </div>
  )
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-muted shadow-sm transition-colors hover:bg-foreground/10">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted/80">{label}</p>
        <p className="truncate text-[15px] font-semibold leading-tight text-foreground">
          {value}
        </p>
      </div>
    </div>
  )
}

function capitalize(value: string) {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}
