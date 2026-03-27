"use client"

export type InAppAppointmentEventType = "created" | "modified" | "cancelled"

type LocalAppointmentMutation = {
  eventType: InAppAppointmentEventType
  appointmentId: string
  bookingGroupId: string
  date: string
  time: string
  timestamp: number
}

type LocalAppointmentMutationInput = {
  eventType: InAppAppointmentEventType
  appointmentId?: string | null
  bookingGroupId?: string | null
  date?: string | null
  time?: string | null
}

const LOCAL_MUTATION_TTL_MS = 20_000
const recentLocalAppointmentMutations: LocalAppointmentMutation[] = []

export function rememberLocalAppointmentMutation(input: LocalAppointmentMutationInput) {
  if (typeof window === "undefined") return

  pruneExpiredLocalMutations()

  recentLocalAppointmentMutations.push({
    eventType: input.eventType,
    appointmentId: normalizeValue(input.appointmentId),
    bookingGroupId: normalizeValue(input.bookingGroupId),
    date: normalizeValue(input.date),
    time: normalizeValue(input.time),
    timestamp: Date.now(),
  })
}

export function consumeLocalAppointmentMutation(input: LocalAppointmentMutationInput) {
  if (typeof window === "undefined") return false

  pruneExpiredLocalMutations()

  const target = {
    eventType: input.eventType,
    appointmentId: normalizeValue(input.appointmentId),
    bookingGroupId: normalizeValue(input.bookingGroupId),
    date: normalizeValue(input.date),
    time: normalizeValue(input.time),
  }

  const index = recentLocalAppointmentMutations.findIndex((candidate) =>
    matchesLocalMutation(candidate, target)
  )

  if (index === -1) return false

  recentLocalAppointmentMutations.splice(index, 1)
  return true
}

function matchesLocalMutation(
  candidate: LocalAppointmentMutation,
  target: Omit<LocalAppointmentMutation, "timestamp">
) {
  if (candidate.eventType !== target.eventType) return false

  if (candidate.appointmentId && target.appointmentId) {
    return candidate.appointmentId === target.appointmentId
  }

  if (
    candidate.eventType === "created" &&
    candidate.bookingGroupId &&
    target.bookingGroupId
  ) {
    return candidate.bookingGroupId === target.bookingGroupId
  }

  if (candidate.date && candidate.time && target.date && target.time) {
    return candidate.date === target.date && candidate.time === target.time
  }

  return false
}

function pruneExpiredLocalMutations() {
  const now = Date.now()

  for (let index = recentLocalAppointmentMutations.length - 1; index >= 0; index -= 1) {
    if (now - recentLocalAppointmentMutations[index].timestamp > LOCAL_MUTATION_TTL_MS) {
      recentLocalAppointmentMutations.splice(index, 1)
    }
  }
}

function normalizeValue(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : ""
}
