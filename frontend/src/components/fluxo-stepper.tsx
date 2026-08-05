'use client'

import { Fragment } from 'react'
import { Check } from 'lucide-react'

export interface FluxoStep {
  key: string
  label: string
}

interface FluxoStepperProps {
  steps: FluxoStep[]
  currentIndex: number
  isFechado: boolean
}

export function FluxoStepper({ steps, currentIndex, isFechado }: FluxoStepperProps) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Histórico do Fluxo</p>
      <div className="flex items-center">
        {steps.map((step, i) => {
          const done = isFechado || i < currentIndex
          const current = !isFechado && i === currentIndex
          return (
            <Fragment key={step.key}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  done ? 'bg-brand-pine' : current ? 'bg-brand-forest' : 'bg-slate-200'
                }`}>
                  {done
                    ? <Check size={13} className="text-white" />
                    : current
                      ? <div className="w-2.5 h-2.5 rounded-full bg-brand-lime" />
                      : <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  }
                </div>
                <span className={`text-[10px] font-medium text-center leading-tight ${
                  done ? 'text-brand-pine' : current ? 'text-brand-forest' : 'text-slate-400'
                }`}>{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mb-4 ${done ? 'bg-brand-pine/40' : 'bg-slate-200'}`} />
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
