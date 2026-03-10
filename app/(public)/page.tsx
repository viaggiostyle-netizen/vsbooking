import ServicesSection from "@/components/services/ServicesSection"
import Stepper from "@/components/ui/Stepper"

export default function PublicHomePage() {
  return (
    <section>
      <div className="mb-[24px] mt-[32px] text-center">
        <h1 className="hero-title">ViaggioStyle</h1>
        <p className="hero-subtitle">
          Eleva tu imagen. Reserva tu cita.
        </p>
      </div>

      <Stepper currentStep={1} />
      <ServicesSection />
    </section>
  )
}
