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
    <div className="relative left-1/2 w-[calc(100%+24px)] max-w-[520px] -translate-x-1/2 space-y-3">
      <div className="overflow-hidden rounded-[12px] border border-border bg-background text-foreground">
        <div className="flex h-[44px] items-center border-b border-border bg-background px-5">
          <h3 className="text-[14px] font-[600] leading-none text-foreground">Tu reserva</h3>
        </div>

        <div className="space-y-5 p-5">
          <Row icon={<UserRound size={20} />} label="Nombre" value={appointment.clientName} />
          <Row icon={<Scissors size={20} />} label="Servicio" value={appointment.service} />
          <Row icon={<Calendar size={20} />} label="Fecha" value={capitalize(formatLongDate(appointment.date))} />
          <Row icon={<Clock3 size={20} />} label="Hora" value={appointment.time} />

          <div className="border-t border-border pt-5">
            <Row icon={<Wallet2 size={20} />} label="Precio" value={formatMoney(appointment.finalPrice)} strong />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="danger" onClick={onCancel} className="rounded-[12px] py-3 text-[15px]">
          Cancelar
        </Button>
        <Button onClick={onModify} className="rounded-[12px] py-3 text-[15px] font-semibold">
          Modificar
        </Button>
      </div>
    </div>
  )
}

function Row({
  icon,
  label,
  value,
  strong = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-start gap-[15px]">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-input text-muted">
        {icon}
      </span>
      <div>
        <p className="text-[12px] text-muted">{label}</p>
        <p className={strong ? "text-[16px] font-[600] leading-none text-foreground" : "text-[14px] font-[600] leading-none text-foreground"}>
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
