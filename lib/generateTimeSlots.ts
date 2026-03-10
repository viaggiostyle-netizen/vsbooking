export function generateTimeSlots(
  startHour: number,
  endHour: number
): string[] {
  const slots: string[] = []

  for (let hour = startHour; hour <= endHour; hour++) {
    const hourFormatted = hour.toString().padStart(2, "0")

    // turno :00
    slots.push(`${hourFormatted}:00`)

    // turno :40
    slots.push(`${hourFormatted}:40`)
  }

  return slots
}

export function generateSlotsFromBlocks(
  blocks: { start: number; end: number }[]
): string[] {
  let slots: string[] = []

  blocks.forEach((block) => {
    slots = slots.concat(generateTimeSlots(block.start, block.end))
  })

  return [...new Set(slots)].sort()
}

export function filterAvailableSlots(
  allSlots: string[],
  bookedSlots: string[]
) {
  return allSlots.filter((slot) => !bookedSlots.includes(slot))
}
