"use client"

import { toast, type ToastOptions } from "react-toastify"

type AppToastVariant = "success" | "error" | "info" | "warning"

type AppToastOptions = ToastOptions & {
  title?: string
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

function AppToastContent({ title, message }: { title: string; message: string }) {
  return (
    <div className="app-toast-content">
      <span className="app-toast-title">{title}</span>
      <span className="app-toast-message">{message}</span>
    </div>
  )
}

function showToast(variant: AppToastVariant, message: string, options: AppToastOptions = {}) {
  const { title = getDefaultTitle(variant), ...toastOptions } = options
  const content = <AppToastContent title={title} message={message} />

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
