"use client"

import { AlertCircle, Check, Info, TriangleAlert, X } from "lucide-react"
import {
  Slide,
  ToastContainer,
  type CloseButtonProps,
  type IconProps,
} from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

function AppToastIcon({ type }: IconProps) {
  if (type === "success") {
    return (
      <span className="app-toast-icon app-toast-icon--success" aria-hidden>
        <Check size={18} />
      </span>
    )
  }

  if (type === "error") {
    return (
      <span className="app-toast-icon app-toast-icon--error" aria-hidden>
        <AlertCircle size={18} />
      </span>
    )
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
      toastClassName={() => "app-toast"}
      progressClassName={() => "app-toast-progress"}
    />
  )
}
