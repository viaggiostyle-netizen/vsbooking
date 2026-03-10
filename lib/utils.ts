export function cn(...values: Array<string | undefined | false | null>) {
  return values.filter(Boolean).join(" ")
}

export function formatMoney(value: number) {
  return `$ ${value.toLocaleString("es-AR")}`
}

export function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (!digits) return ""

  let normalized = digits
  while (normalized.startsWith("549549")) {
    normalized = normalized.slice(3)
  }

  return normalized
}
