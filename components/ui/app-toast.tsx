"use client"

import { Check, TriangleAlert, X } from "lucide-react"
import { toast, type ToastOptions } from "react-toastify"
import { ADMIN_APPOINTMENT_TOAST_CONTAINER_ID } from "@/components/ui/toast-constants"

type AppToastVariant = "success" | "error" | "info" | "warning"
type AdminAppointmentToastVariant = "success" | "warning" | "error"

type AppToastOptions = ToastOptions & {
  title?: string
}

type AdminAppointmentToastOptions = Omit<ToastOptions, "containerId"> & {
  title: string
}

function getDefaultTitle(variant: AppToastVariant) {
  switch (variant) {
    case "success":
      return "Accion completada"
    case "error":
      return "Algo salio mal"
    case "warning":
      return "Atencion"
    default:
      return "Aviso"
  }
}

function AppToastContent({
  variant,
  title,
  message,
}: {
  variant: AppToastVariant
  title: string
  message: string
}) {
  if (variant === "success" || variant === "error") {
    return (
      <div className={`app-toast-featured app-toast-featured--${variant}`}>
        <span className="app-toast-featured__badge" aria-hidden>
          {variant === "success" ? <Check size={24} /> : <X size={24} />}
        </span>
        <span className="app-toast-featured__accent" aria-hidden />
        <span className="app-toast-featured__dots" aria-hidden />
        <div className="app-toast-featured__copy">
          <span className="app-toast-featured__title">{title}</span>
          <span className="app-toast-featured__message">{message}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="app-toast-content">
      <span className="app-toast-title">{title}</span>
      <span className="app-toast-message">{message}</span>
    </div>
  )
}

function AdminAppointmentToastContent({
  variant,
  title,
  message,
}: {
  variant: AdminAppointmentToastVariant
  title: string
  message: string
}) {
  return (
    <div className="app-live-toast-card">
      <span className="app-live-toast-card__icon" aria-hidden>
        {variant === "success" ? (
          <Check size={24} />
        ) : variant === "warning" ? (
          <TriangleAlert size={24} />
        ) : (
          <X size={24} />
        )}
      </span>
      <div className="app-live-toast-card__copy">
        <span className="app-live-toast-card__title">{title}</span>
        <span className="app-live-toast-card__message">{message}</span>
      </div>
    </div>
  )
}

function showToast(variant: AppToastVariant, message: string, options: AppToastOptions = {}) {
  const { title = getDefaultTitle(variant), ...toastOptions } = options
  const content = <AppToastContent variant={variant} title={title} message={message} />

  switch (variant) {
    case "success":
      return toast.success(content, toastOptions)
    case "error":
      return toast.error(content, toastOptions)
    case "warning":
      return toast.warning(content, toastOptions)
    default:
      return toast.info(content, toastOptions)
  }
}

export function showAdminAppointmentEventToast(
  variant: AdminAppointmentToastVariant,
  message: string,
  options: AdminAppointmentToastOptions
) {
  const { title, ...toastOptions } = options
  const content = (
    <AdminAppointmentToastContent variant={variant} title={title} message={message} />
  )
  const baseOptions = {
    containerId: ADMIN_APPOINTMENT_TOAST_CONTAINER_ID,
    ...toastOptions,
  }

  switch (variant) {
    case "success":
      return toast.success(content, baseOptions)
    case "warning":
      return toast.warning(content, baseOptions)
    default:
      return toast.error(content, baseOptions)
  }
}

export function showSuccessToast(message: string, options?: AppToastOptions) {
  return showToast("success", message, options)
}

export function showErrorToast(message: string, options?: AppToastOptions) {
  return showToast("error", message, options)
}

export function showInfoToast(message: string, options?: AppToastOptions) {
  return showToast("info", message, options)
}

export function showWarningToast(message: string, options?: AppToastOptions) {
  return showToast("warning", message, options)
}
