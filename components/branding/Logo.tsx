"use client"

import Image from "next/image"
import { useTheme } from "next-themes"
import { useMemo, useState, useSyncExternalStore } from "react"

type LogoProps = {
  size?: number
  className?: string
}

export default function Logo({ size = 120, className = "" }: LogoProps) {
  const { theme, resolvedTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const currentTheme = theme === "system" ? resolvedTheme : theme
  const tone = currentTheme === "dark" ? "dark" : "light"

  if (!mounted) {
    return <span aria-hidden className={className} style={{ width: size, height: size }} />
  }

  return <ThemeLogo key={tone} tone={tone} size={size} className={className} />
}

function ThemeLogo({
  tone,
  size,
  className,
}: {
  tone: "dark" | "light"
  size: number
  className: string
}) {
  const candidates = useMemo(
    () => [
      `/logos/logo-${tone}.webp`,
      `/logos/logo-${tone}.png`,
      `/images/logo-${tone}.webp`,
      `/images/logo-${tone}.png`,
    ],
    [tone]
  )
  const [attempt, setAttempt] = useState(0)
  const src = candidates[Math.min(attempt, candidates.length - 1)]

  return (
    <Image
      src={src}
      alt="Logo Barberia"
      width={size}
      height={size}
      priority
      unoptimized
      onError={() => {
        setAttempt((prev) => Math.min(prev + 1, candidates.length - 1))
      }}
      className={`object-contain transition-all duration-300 ease-in-out ${className}`}
    />
  )
}
