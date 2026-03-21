"use client"

import { useEffect } from "react"
import type { ReactNode } from "react"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "framer-motion"
import AdminHeader from "@/components/layout/AdminHeader"

type AdminLayoutProps = {
  children: ReactNode
  header: ReactNode
  sidebar: ReactNode
  drawerSidebar?: ReactNode
  isSidebarOpen: boolean
  onCloseSidebar: () => void
  contentKey?: string
}

export default function AdminLayout({
  children,
  header,
  sidebar,
  drawerSidebar,
  isSidebarOpen,
  onCloseSidebar,
  contentKey = "admin",
}: AdminLayoutProps) {
  const reduceMotion = useReducedMotion()
  const emphasizedEase = [0.22, 1, 0.36, 1] as const

  useEffect(() => {
    if (!isSidebarOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseSidebar()
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isSidebarOpen, onCloseSidebar])

  const overlayTransition: Transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: "easeOut" }

  const drawerTransition: Transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: emphasizedEase }

  const contentVariants: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0 : 0.3, ease: emphasizedEase },
    },
    exit: {
      opacity: 0,
      y: reduceMotion ? 0 : -8,
      transition: { duration: reduceMotion ? 0 : 0.2, ease: "easeIn" },
    },
  }

  return (
    <div className="admin-shell flex min-h-screen bg-background text-foreground">
      <div className="hidden lg:flex lg:flex-col">{sidebar}</div>

      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={overlayTransition}
              onClick={onCloseSidebar}
              aria-hidden
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[82vw] max-w-[320px] lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={drawerTransition}
              role="dialog"
              aria-modal="true"
            >
              {drawerSidebar ?? sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="admin-content min-w-0 flex-1 overflow-x-hidden bg-background">
        <AdminHeader>{header}</AdminHeader>

        <main className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={contentKey}
              variants={contentVariants}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
