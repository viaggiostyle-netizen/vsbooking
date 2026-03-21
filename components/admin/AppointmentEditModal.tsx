"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, ChevronLeft, Check, AlertCircle, UserX, EyeOff, Pencil, Trash2 } from "lucide-react"
import CalendarBase from "@/components/booking/Calendar"
import ServicePicker from "@/components/admin/ServicePicker"
import Button from "@/components/ui/Button"
import Modal from "@/components/ui/Modal"
import type { Service } from "@/lib/admin-organization"
import type { Appointment } from "@/types/Appointment"

type ModalView = "menu" | "modify" | "delete_confirm" | "modify_success"

type AppointmentEditModalProps = {
  open: boolean
  appointment: Appointment | null
  services: Service[]
  selectedServiceId: string
  selectedDate: string
  selectedTime: string
  availableSlots: string[]
  isDateBlocked: (dateKey: string) => boolean
  isSaving: boolean
  error?: string
  onClose: () => void
  onSelectService: (serviceId: string) => void
  onSelectDate: (dateKey: string) => void
  onSelectTime: (time: string) => void
  onComplete: () => Promise<void>
  onNoShowWithNotice: () => Promise<void>
  onNoShow: () => Promise<void>
  onModify: () => Promise<boolean>
  onDelete: () => Promise<void>
}

export default function AppointmentEditModal({
  open,
  appointment,
  services,
  selectedServiceId,
  selectedDate,
  selectedTime,
  availableSlots,
  isDateBlocked,
  isSaving,
  error,
  onClose,
  onSelectService,
  onSelectDate,
  onSelectTime,
  onComplete,
  onNoShowWithNotice,
  onNoShow,
  onModify,
  onDelete,
}: AppointmentEditModalProps) {
  const [view, setView] = useState<ModalView>("menu")

  if (!appointment) return null

  const execute = async (callback: () => Promise<void>) => {
    await callback()
  }

  const executeModify = async () => {
    const success = await onModify()
    if (success) setView("modify_success")
  }

  return (
    <Modal open={open} onClose={onClose} align="top" className="max-w-[390px] p-0 border-none shadow-none bg-transparent">
      <div className="glass-card animate-apple-in">
        <AnimatePresence mode="wait">
          {view === "menu" && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="p-5"
            >
              <div className="mb-6">
                <h3 className="text-[22px] font-bold tracking-tight">Gestionar Turno</h3>
                <p className="text-[14px] text-muted font-medium mt-1">
                  {appointment.clientName}
                </p>
                <div className="flex items-center gap-2 mt-2 py-1.5 px-3 bg-muted/30 rounded-xl w-fit">
                  <Calendar size={14} className="text-muted" />
                  <span className="text-[13px] font-semibold">{appointment.date}</span>
                  <span className="text-muted">•</span>
                  <span className="text-[13px] font-bold">{appointment.time}</span>
                </div>
              </div>

              <div className="grid gap-2">
                <QuickActionButton
                  disabled={isSaving}
                  onClick={() => execute(onComplete)}
                  icon={<Check size={18} className="text-emerald-500" />}
                >
                  Marcar como completado
                </QuickActionButton>

                <QuickActionButton
                  disabled={isSaving}
                  onClick={() => execute(onNoShowWithNotice)}
                  icon={<UserX size={18} className="text-orange-500" />}
                >
                  No vino, pero avisó
                </QuickActionButton>

                <QuickActionButton
                  disabled={isSaving}
                  onClick={() => execute(onNoShow)}
                  icon={<EyeOff size={18} className="text-rose-400" />}
                >
                  No show (ausente)
                </QuickActionButton>

                <div className="h-[1px] bg-border/20 my-2" />

                <QuickActionButton
                  disabled={isSaving}
                  onClick={() => setView("modify")}
                  className="bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                  icon={<Pencil size={18} className="text-zinc-500 dark:text-zinc-400" />}
                >
                  Modificar día u horario
                </QuickActionButton>

                <QuickActionButton
                  disabled={isSaving}
                  className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-transparent"
                  onClick={() => setView("delete_confirm")}
                  icon={<Trash2 size={18} className="text-red-500" />}
                >
                  Eliminar turno permanentemente
                </QuickActionButton>
              </div>

              {error && (
                <div className="mt-4 flex items-center gap-2 text-red-500 text-[12px] font-medium bg-red-500/5 p-3 rounded-xl">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
            </motion.div>
          )}

          {view === "delete_confirm" && (
            <motion.div
              key="delete"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="p-6"
            >
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="text-red-500" size={24} />
                </div>
                <h3 className="text-[20px] font-bold">¿Cancelar turno?</h3>
                <p className="mt-2 text-[14px] text-muted leading-relaxed">
                  Esta acción no se puede deshacer. Por favor, asegurate de avisar al cliente.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="destructive"
                  className="h-12 rounded-xl font-bold"
                  disabled={isSaving}
                  onClick={() => execute(onDelete)}
                >
                  Sí, eliminar turno
                </Button>
                <Button
                  variant="ghost"
                  className="h-12 rounded-xl font-semibold"
                  onClick={() => setView("menu")}
                >
                  Volver atrás
                </Button>
              </div>
            </motion.div>
          )}

          {view === "modify" && (
            <motion.div
              key="modify"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setView("menu")}
                    className="p-1.5 hover:bg-muted/30 rounded-full transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <h3 className="text-[17px] font-bold tracking-tight">Modificar cita</h3>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1 relative" id="service-selector">
                  <label className="text-[11px] font-bold text-muted/60 uppercase tracking-widest ml-1">Servicio</label>
                  <ServicePicker
                    services={services}
                    selectedId={selectedServiceId}
                    onSelect={onSelectService}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted/60 uppercase tracking-widest ml-1">Fecha</label>
                  <CalendarBase
                    value={selectedDate}
                    onSelect={(date) => onSelectDate(date)}
                    isBlocked={isDateBlocked}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted/60 uppercase tracking-widest ml-1">Horario</label>
                  <div className="grid grid-cols-4 gap-1.5 max-h-[120px] overflow-y-auto no-scrollbar pt-0.5">
                    {availableSlots.length === 0 ? (
                      <p className="col-span-4 text-center py-4 text-[12px] text-muted italic">No hay horarios</p>
                    ) : (
                      availableSlots.map(slot => (
                        <button
                          key={slot}
                          onClick={() => onSelectTime(slot)}
                          className={`time-slot !text-[12px] !py-2 ${selectedTime === slot ? 'selected' : ''}`}
                        >
                          {slot}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  disabled={isSaving || !selectedTime}
                  onClick={executeModify}
                  className="w-full h-11 rounded-xl font-bold bg-foreground text-background hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Confirmar
                </Button>
              </div>

              {error && (
                <p className="mt-2 text-center text-[11px] font-medium text-red-500">{error}</p>
              )}
            </motion.div>
          )}

          {view === "modify_success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="p-6 text-center"
            >
              <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                <Check className="text-emerald-500" size={32} />
              </div>
              <h3 className="text-[22px] font-bold">¡Cita modificada!</h3>
              <p className="mt-3 text-[15px] text-muted leading-relaxed">
                El cambio se ha registrado correctamente. El cliente recibirá la actualización si corresponde.
              </p>

              <Button
                onClick={onClose}
                className="mt-8 w-full h-12 rounded-2xl font-bold bg-foreground text-background"
              >
                Cerrar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  )
}

function QuickActionButton({
  children,
  onClick,
  disabled,
  className = "",
  icon,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  className?: string
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-between w-full h-14 rounded-2xl border border-border/10 bg-black/5 dark:bg-white/5 px-5 text-left text-[14px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <span className="opacity-90">{children}</span>
      {icon}
    </button>
  )
}
