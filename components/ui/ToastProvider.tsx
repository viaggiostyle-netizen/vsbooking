"use client"

import { ToastContainer, Slide } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

export function AppToastProvider() {
  return (
    <ToastContainer
      position="top-right"
      autoClose={3200}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnHover
      draggable
      pauseOnFocusLoss={false}
      theme="dark"
      transition={Slide}
      toastClassName={() =>
        "rounded-2xl bg-[#020617]/90 border border-white/10 text-sm text-white shadow-xl backdrop-blur-md"
      }
      bodyClassName={() => "flex items-center gap-2 text-sm font-medium"}
      progressClassName={() => "bg-[var(--accent)]"}
    />
  )
}

