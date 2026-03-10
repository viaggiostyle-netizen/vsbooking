import TimeSlotPicker, { Slot } from "@/components/ui/TimeSlotPicker"

type TimePickerProps = {
  slots: (string | Slot)[]
  value: string
  onChange: (time: string) => void
}

export default function TimePicker({ slots, value, onChange }: TimePickerProps) {
  return <TimeSlotPicker slots={slots} value={value} onChange={onChange} />
}
