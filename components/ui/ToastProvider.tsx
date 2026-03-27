"use client"

import { Info, TriangleAlert, X } from "lucide-react"
import {
  Slide,
  ToastContainer,
  type CloseButtonProps,
  type IconProps,
} from "react-toastify"
import { ADMIN_APPOINTMENT_TOAST_CONTAINER_ID } from "@/components/ui/toast-constants"
import "react-toastify/dist/ReactToastify.css"

function AppToastIcon({ type }: IconProps) {
  if (type === "success" || type === "error") {
    return null
  }

  if (type === "warning") {
    return (
      <span className="app-toast-icon app-toast-icon--warning" aria-hidden>
        <TriangleAlert size={18} />
      </span>
    )
  }

  return (
    <span className="app-toast-icon app-toast-icon--info" aria-hidden>
      <Info size={18} />
    </span>
  )
}

function AppToastCloseButton({ closeToast }: CloseButtonProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        closeToast(true)
      }}
      className="app-toast-close"
      aria-label="Cerrar notificacion"
    >
      <X size={14} />
    </button>
  )
}

export function AppToastProvider() {
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3400}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        pauseOnFocusLoss={false}
        theme="dark"
        transition={Slide}
        limit={4}
        closeButton={AppToastCloseButton}
        icon={AppToastIcon}
        toastClassName={(context) => `app-toast app-toast--${context?.type ?? "default"}`}
        progressClassName={(context) => `app-toast-progress app-toast-progress--${context?.type ?? "default"}`}
      />
      <ToastContainer
        containerId={ADMIN_APPOINTMENT_TOAST_CONTAINER_ID}
        position="top-right"
        autoClose={6400}
        hideProgressBar
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable={false}
        pauseOnFocusLoss={false}
        theme="dark"
        transition={Slide}
        limit={4}
        closeButton={AppToastCloseButton}
        icon={false}
        toastClassName={(context) => `app-live-toast app-live-toast--${context?.type ?? "default"}`}
      />
    </>
  )
}
