"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepperProps {
    currentStep: number
}

const steps = [
    "Servicio",
    "Datos",
    "Confirmación"
]

export default function Stepper({ currentStep }: StepperProps) {
    return (
        <div className="w-full max-w-md mx-auto mb-8">

            <div className="relative flex items-start justify-between w-full">

                {/* Absolute Lines connecting the exact centers of 1st and 3rd flex-1 items (16.66% from edges) */}
                <div className="absolute top-5 left-[16.666%] right-[16.666%] h-[2px] bg-border z-0" />
                <div
                    className="absolute top-5 left-[16.666%] h-[2px] bg-foreground z-0 transition-all duration-300 ease-out"
                    style={{ width: `calc(66.666% * ${currentStep === 1 ? 0 : currentStep === 2 ? 0.5 : 1})` }}
                />

                {steps.map((label, index) => {

                    const stepNumber = index + 1

                    const isCompleted = stepNumber < currentStep
                    const isActive = stepNumber === currentStep
                    const isPending = stepNumber > currentStep

                    return (
                        <div key={index} className="relative z-10 flex flex-col items-center flex-1">

                            {/* Circle */}
                            <div
                                className={cn(
                                    "flex items-center justify-center",
                                    "w-10 h-10 rounded-full border",
                                    "transition-all duration-300 ease-out bg-card", // bg-card prevents lines showing through transparent gaps

                                    isCompleted &&
                                    "bg-foreground border-foreground text-background",

                                    isActive &&
                                    "bg-foreground border-foreground text-background scale-105",

                                    isPending &&
                                    "bg-muted border-border text-muted-foreground"
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="w-5 h-5" />
                                ) : (
                                    stepNumber
                                )}
                            </div>

                            {/* Label */}
                            <span
                                className={cn(
                                    "mt-2 text-xs transition-colors duration-300 text-center",

                                    isCompleted && "text-foreground",
                                    isActive && "text-foreground font-medium",
                                    isPending && "text-muted-foreground"
                                )}
                            >
                                {label}
                            </span>

                        </div>
                    )
                })}

            </div>

        </div>
    )
}
