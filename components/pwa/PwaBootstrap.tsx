"use client"

import { useEffect } from "react"

const APPLE_ICON_LIGHT = "/icons/icon-light-512.png"
const APPLE_ICON_DARK = "/icons/icon-dark-512.png"

function syncAppleTouchIcon() {
  const isDark = document.documentElement.classList.contains("dark")
  const targetHref = isDark ? APPLE_ICON_DARK : APPLE_ICON_LIGHT

  let iconLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null
  if (!iconLink) {
    iconLink = document.createElement("link")
    iconLink.setAttribute("rel", "apple-touch-icon")
    document.head.appendChild(iconLink)
  }

  if (!iconLink.getAttribute("href")?.endsWith(targetHref)) {
    iconLink.setAttribute("href", targetHref)
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return
  navigator.serviceWorker.register("/sw.js").catch(() => {})
}

export default function PwaBootstrap() {
  useEffect(() => {
    syncAppleTouchIcon()

    const observer = new MutationObserver(() => {
      syncAppleTouchIcon()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    if (document.readyState === "complete") {
      registerServiceWorker()
    } else {
      const onLoad = () => registerServiceWorker()
      window.addEventListener("load", onLoad, { once: true })
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  return null
}

