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
  const serviceLabel = bookings.map((item) => item.service).join(", ")
  const professional = "Camilo"
  const dateLabel = titleCase(formatLongDate(first.date))
  const timeLabel = `${first.time} hs`

  const details = [
    { label: "Servicio", value: serviceLabel },
    { label: "Profesional", value: professional },
    { label: "Fecha", value: dateLabel },
    { label: "Hora", value: timeLabel },
  ]

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
            <header>
              <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.025em] text-[#0F172A] dark:text-[#F2F2F2]">
                Confirmar tu turno
              </h1>
              <p className="mt-2 text-[13px] font-medium tracking-[0.005em] text-[#0F172A] opacity-60 dark:text-[#F2F2F2] dark:opacity-65">
                Revisa los detalles antes de continuar
              </p>
            </header>

            <div className="mt-7 rounded-[24px] border border-[#EDEDED] bg-[#F2F2F2] p-5 dark:border-[#1C1C1C] dark:bg-[#111111]">
              {details.map((item, index) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between gap-4 py-3 ${index < details.length - 1 ? "border-b border-[#EDEDED] dark:border-[#1C1C1C]" : ""
                    }`}
                >
                  <span className="text-[13px] font-medium text-[#0F172A] opacity-60 dark:text-[#F2F2F2] dark:opacity-60">
                    {item.label}
                  </span>
                  <span className="text-right text-[15px] font-semibold tracking-[-0.01em] text-[#0F172A] dark:text-[#F2F2F2]">
                    {item.value}
                  </span>
                </div>
              ))}

              <div className="mt-5 border-t border-[#EDEDED] pt-5 dark:border-[#1C1C1C]">
                <p className="text-[13px] font-medium text-[#0F172A] opacity-60 dark:text-[#F2F2F2] dark:opacity-60">
                  Precio
                </p>
                <p className="mt-2 text-[34px] font-semibold leading-[1] tracking-[-0.025em] text-[#0F172A] dark:text-[#F2F2F2]">
                  {formatMoney(total)}
                </p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="h-11 rounded-[18px] border border-[#EDEDED] bg-[#F4F4F4] text-[14px] font-semibold text-[#0F172A] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_#1111111A] active:scale-[0.98] dark:border-[#1C1C1C] dark:bg-[#1C1C1C] dark:text-[#F2F2F2] dark:hover:shadow-[0_14px_32px_#11111166]"
              >
                Volver
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={viewState === "loading"}
                className="h-11 rounded-[18px] border border-[#111111] bg-[#111111] text-[14px] font-semibold text-[#F2F2F2] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_#11111133] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-75 dark:border-[#F2F2F2] dark:bg-[#F2F2F2] dark:text-[#111111] dark:hover:shadow-[0_14px_32px_#11111166]"
              >
                {viewState === "loading" ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-[14px] w-[14px] animate-spin rounded-full border-2 border-[#F2F2F2] border-t-[#EDEDED] dark:border-[#111111] dark:border-t-[#1C1C1C]" />
                    Confirmando
                  </span>
                ) : (
                  "Confirmar turno"
                )}
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
