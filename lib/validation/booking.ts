export type ValidationResult =
  | { valid: true; normalized: string }
  | { valid: false; message: string; normalized: string }

type BookingContactInput = {
  name: string
  phone: string
  email: string
}

const EMAIL_REGEX = /^(?!.*\.\.)[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}$/i
const ARG_MOBILE_INTL_REGEX = /^549\d{10,11}$/

function stripArgentinaDialPrefix(digits: string) {
  let normalized = digits

  while (normalized.startsWith("549549")) {
    normalized = normalized.slice(3)
  }

  if (normalized.startsWith("549")) {
    normalized = normalized.slice(3)
  } else if (normalized.startsWith("54")) {
    normalized = normalized.slice(2)
  }

  if (normalized.startsWith("0")) {
    normalized = normalized.slice(1)
  }

  return normalized
}

export function sanitizePhoneLocalInput(value: string) {
  const digits = value.replace(/\D/g, "")
  return stripArgentinaDialPrefix(digits).slice(0, 11)
}

export function normalizeArgentinaMobilePhone(localPhone: string) {
  const digits = sanitizePhoneLocalInput(localPhone)
  if (!digits) return ""
  return `549${digits}`
}

export function validateArgentinaMobilePhone(localPhone: string): ValidationResult {
  const digits = sanitizePhoneLocalInput(localPhone)
  const normalized = normalizeArgentinaMobilePhone(digits)

  if (!digits) {
    return { valid: false, message: "El telefono es obligatorio.", normalized }
  }

  if (digits.length < 10 || digits.length > 11) {
    return {
      valid: false,
      message: "El numero debe tener entre 10 y 11 digitos locales.",
      normalized,
    }
  }

  if (digits.startsWith("0")) {
    return {
      valid: false,
      message: "Ingresa el codigo de area sin 0 inicial.",
      normalized,
    }
  }

  if (!ARG_MOBILE_INTL_REGEX.test(normalized)) {
    return {
      valid: false,
      message: "Numero argentino invalido. Usa formato movil.",
      normalized,
    }
  }

  return { valid: true, normalized }
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function validateEmail(email: string): ValidationResult {
  const normalized = normalizeEmail(email)

  if (!normalized) {
    return { valid: false, message: "El email es obligatorio.", normalized }
  }

  if (/\s/.test(normalized)) {
    return { valid: false, message: "El email no puede contener espacios.", normalized }
  }

  if (!EMAIL_REGEX.test(normalized)) {
    return { valid: false, message: "Formato de email invalido.", normalized }
  }

  const domain = normalized.split("@")[1] ?? ""
  const labels = domain.split(".")
  if (labels.length < 2 || labels.some((label) => !label || label.startsWith("-") || label.endsWith("-"))) {
    return { valid: false, message: "Dominio de email invalido.", normalized }
  }

  return { valid: true, normalized }
}

export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ")
}

export function validateName(name: string): ValidationResult {
  const normalized = normalizeName(name)
  if (!normalized) {
    return { valid: false, message: "El nombre es obligatorio.", normalized }
  }
  if (normalized.length < 2) {
    return { valid: false, message: "El nombre es demasiado corto.", normalized }
  }
  return { valid: true, normalized }
}

export function validateBookingContact(input: BookingContactInput) {
  const nameResult = validateName(input.name)
  const phoneResult = validateArgentinaMobilePhone(input.phone)
  const emailResult = validateEmail(input.email)

  return {
    ok: nameResult.valid && phoneResult.valid && emailResult.valid,
    name: nameResult,
    phone: phoneResult,
    email: emailResult,
  }
}
