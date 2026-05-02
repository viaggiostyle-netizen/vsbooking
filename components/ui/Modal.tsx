import { cn } from "@/lib/utils"

type ModalProps = {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  align?: "center" | "top"
}

export default function Modal({ open, onClose, children, className, align = "center" }: ModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className={cn(
          "w-full min-h-full flex justify-center p-4",
          align === "center" ? "items-center" : "items-start"
        )}
      >
        <div
          className={cn(
            "w-full relative transition-[margin] duration-300 ease-out",
            align === "top" ? "mt-[6vh] mb-12" : "my-auto",
            className
          )}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
