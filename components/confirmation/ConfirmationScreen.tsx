"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { formatLongDate } from "@/lib/date"
import { formatMoney } from "@/lib/utils"
import { useAppointmentsStore } from "@/stores/useAppointmentsStore"

type ConfirmationScreenProps = {
  groupId: string
}

type ViewState = "review" | "loading" | "success"

export default function ConfirmationScreen({ groupId }: ConfirmationScreenProps) {
  const router = useRouter()
  const appointments = useAppointmentsStore((state) => state.appointments)
  const bookings = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.bookingGroupId === groupId)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, groupId]
  )
  const first = bookings[0]
  const [viewState, setViewState] = useState<ViewState>("review")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!first) {
    return (
      <section className="relative left-1/2 w-screen -translate-x-1/2 px-4 py-10">
        <div className="mx-auto w-full max-w-[460px] rounded-[34px] border border-[#EDEDED] bg-[#F4F4F4] p-9 text-center shadow-[0_16px_44px_#11111114] dark:border-[#1C1C1C] dark:bg-[#1C1C1C] dark:shadow-[0_16px_44px_#11111166]">
          <p className="text-[18px] font-semibold tracking-[-0.01em] text-[#0F172A] dark:text-[#F2F2F2]">
            No encontramos la reserva.
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-[18px] border border-[#EDEDED] bg-[#F4F4F4] px-6 text-[14px] font-semibold text-[#0F172A] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_#1111111A] active:scale-[0.98] dark:border-[#1C1C1C] dark:bg-[#1C1C1C] dark:text-[#F2F2F2] dark:hover:shadow-[0_14px_32px_#11111166]"
          >
            Volver
          </button>
        </div>
      </section>
    )
  }

  const total = bookings.reduce((sum, item) => sum + item.finalPrice, 0)
  const professional = "Camilo"
  const dateLabel = titleCase(formatLongDate(first.date))

  const handleConfirm = () => {
    if (viewState !== "review") return
    setViewState("loading")
    timerRef.current = setTimeout(() => {
      setViewState("success")
    }, 1100)
  }

  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden px-4 py-10 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_120%_at_0%_0%,#F4F4F4_0%,#F2F2F2_62%,#F2F2F2_100%)] dark:bg-[radial-gradient(120%_120%_at_0%_0%,#1C1C1C_0%,#111111_62%,#111111_100%)]" />

      <div className="mx-auto flex min-h-[calc(100vh-130px)] w-full max-w-[460px] items-center justify-center">
        <article
          className="animate-apple-in relative w-full overflow-hidden rounded-[34px] border border-[#EDEDED] bg-[#F4F4F4] p-9 shadow-[0_18px_54px_#1111111A] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-[#1C1C1C] dark:bg-[#1C1C1C] dark:shadow-[0_18px_54px_#11111180] hover:-translate-y-0.5 hover:shadow-[0_22px_60px_#11111122] dark:hover:shadow-[0_22px_60px_#11111199]"
        >
          <div
            className={`transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${viewState === "success" ? "pointer-events-none opacity-0 translate-y-2 scale-[0.98]" : "opacity-100 translate-y-0 scale-100"
              }`}
          >
            <header className="mb-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#f2f2f2]/10 border border-white/10">
                <Check className="h-8 w-8 text-[#f2f2f2]" strokeWidth={2.5} />
              </div>
              <h1 className="text-[32px] font-bold tracking-tight text-[#f2f2f2] leading-tight">
                Confirmar tu turno
              </h1>
              <p className="mt-2 text-[15px] font-medium text-[#94a3b8]">
                Revisa los detalles antes de continuar
              </p>
            </header>

            <div className="space-y-6 rounded-[32px] bg-[#111111]/40 p-7 backdrop-blur-2xl border border-white/5 shadow-2xl">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#94a3b8]/60">Profesional</span>
                  <p className="mt-1 text-[16px] font-semibold text-[#f2f2f2]">{professional}</p>
                </div>
                <div className="text-right">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#94a3b8]/60">Fecha</span>
                  <p className="mt-1 text-[16px] font-semibold text-[#f2f2f2]">{dateLabel}</p>
                </div>
              </div>

              <div className="space-y-3 border-t border-white/5 pt-6">
                <p className="text-[12px] font-bold uppercase tracking-wider text-[#94a3b8]/60 mb-4">Detalle de Servicios</p>
                {bookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between rounded-2xl bg-white/5 p-4 border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[15px] font-semibold text-[#f2f2f2]">{booking.service}</span>
                      <span className="text-[13px] text-[#94a3b8]">Duración: {booking.durationMin} min</span>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center justify-center rounded-full bg-[#f2f2f2] px-3 py-1 text-[13px] font-bold text-black shadow-lg">
                        {booking.time} hs
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 border-t border-white/10 pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-medium text-[#94a3b8]">Pago total</span>
                  <span className="text-[32px] font-black tracking-tight text-[#f2f2f2]">
                    {formatMoney(total)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={viewState === "loading"}
                className="h-[64px] w-full rounded-[24px] bg-[#f2f2f2] text-[17px] font-bold text-[#000000] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
              >
                {viewState === "loading" ? (
                  <div className="flex items-center justify-center gap-3">
                    <span className="h-5 w-5 animate-spin rounded-full border-3 border-black/20 border-t-black" />
                    Confirmando Reserva
                  </div>
                ) : (
                  "Confirmar ahora"
                )}
              </button>
              
              <button
                type="button"
                onClick={() => router.push("/")}
                className="h-[54px] w-full rounded-[20px] text-[15px] font-semibold text-[#94a3b8] transition-colors hover:text-[#f2f2f2]"
              >
                Cancelar y volver
              </button>
            </div>
          </div>

          <div
            className={`absolute inset-0 flex flex-col items-center justify-center px-8 text-center transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${viewState === "success" ? "pointer-events-auto opacity-100 scale-100 translate-y-0" : "pointer-events-none opacity-0 scale-[0.95] translate-y-3"
              }`}
          >
            <div className="grid h-[68px] w-[68px] place-items-center rounded-full border border-[#EDEDED] bg-[#F2F2F2] shadow-[0_14px_30px_#1111111A] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-[#1C1C1C] dark:bg-[#111111] dark:shadow-[0_14px_30px_#11111180]">
              <Check className="h-[30px] w-[30px] text-[#0F172A] dark:text-[#F2F2F2]" strokeWidth={2.5} />
            </div>
            <h2 className="mt-5 text-[30px] font-semibold leading-[1.02] tracking-[-0.02em] text-[#0F172A] dark:text-[#F2F2F2]">
              ¡Gracias por confiar en ViaggioStyle!
            </h2>
            <p className="mt-2 text-[14px] font-medium tracking-[0.005em] text-[#0F172A] opacity-65 dark:text-[#F2F2F2] dark:opacity-65">
              Su turno ha sido confirmado, te esperamos.
            </p>
            <p className="mt-2 text-[14px] font-medium tracking-[0.005em] text-[#0F172A] opacity-65 dark:text-[#F2F2F2] dark:opacity-65">
              Cualquier consulta comunicate por WhatsApp.
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-[18px] border border-[#EDEDED] bg-[#F4F4F4] px-6 text-[14px] font-semibold text-[#0F172A] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_#1111111A] active:scale-[0.98] dark:border-[#1C1C1C] dark:bg-[#1C1C1C] dark:text-[#F2F2F2] dark:hover:shadow-[0_14px_32px_#11111166]"
            >
              <X size={16} className="text-[#0F172A] dark:text-[#F2F2F2]" />
              Cerrar
            </button>
          </div>
        </article>
      </div>
    </section>
  )
}

function titleCase(value: string) {
  if (!value) return value
  return value
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ")
}
