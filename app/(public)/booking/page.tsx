import BookingForm from "@/components/booking/BookingForm"
import Stepper from "@/components/ui/Stepper"

export default function BookingPage() {
  return (
    <div className="pt-8">
      <Stepper currentStep={2} />
      <BookingForm />
    </div>
  )
}
