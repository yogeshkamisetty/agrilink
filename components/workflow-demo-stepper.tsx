'use client'

import { useEffect, useState } from 'react'
import {
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  Layers,
  RotateCcw,
  Sparkles,
  Truck,
  Package,
  ShieldCheck,
  CircleDollarSign,
  Scale,
  ShoppingBag,
  Info,
} from 'lucide-react'
import {
  getWorkflowState,
  fastForwardToStage,
  resetWorkflowToDemoBaseline,
  type WorkflowState,
} from '@/lib/workflow-engine'

interface WorkflowDemoStepperProps {
  currentRole?: string
  onStageChange?: (newStage: number) => void
}

const STAGES = [
  {
    num: 1,
    title: '1. Declared',
    desc: '400 kg ready at farmgate',
    badge: '400 kg Declared',
    icon: Package,
    color: 'emerald',
  },
  {
    num: 2,
    title: '2. Scheduled',
    desc: '24 Sep • 8–10 AM at Anand Hub',
    badge: 'Slot Confirmed',
    icon: Clock,
    color: 'blue',
  },
  {
    num: 3,
    title: '3. Scale Gross',
    desc: '392 kg on weighbridge scale',
    badge: '392 kg Scale',
    icon: Scale,
    color: 'amber',
  },
  {
    num: 4,
    title: '4. GradeCam QC',
    desc: '370 kg accepted Grade A (22kg sorting)',
    badge: '370 kg Verified Stock',
    icon: ShieldCheck,
    color: 'emerald',
  },
  {
    num: 5,
    title: '5. Buyer Order',
    desc: 'Buyer orders 300 kg → 70 kg remaining',
    badge: '300kg Reserved (70kg Left)',
    icon: ShoppingBag,
    color: 'purple',
  },
  {
    num: 6,
    title: '6. Dispatch',
    desc: 'Moves 300 kg out of available',
    badge: 'In Transit (AP XX 1234)',
    icon: Truck,
    color: 'blue',
  },
  {
    num: 7,
    title: '7. Settlement',
    desc: '370 kg accepted × ₹30 - ₹240 = ₹10,860',
    badge: '₹10,860 Disbursed',
    icon: CircleDollarSign,
    color: 'emerald',
  },
]

export function WorkflowDemoStepper({ currentRole, onStageChange }: WorkflowDemoStepperProps) {
  const [state, setState] = useState<WorkflowState>(getWorkflowState())
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    setState(getWorkflowState())

    const handleSync = () => {
      setState(getWorkflowState())
    }

    window.addEventListener('agrilink:workflow-updated', handleSync)
    let bc: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('agrilink_sync')
        bc.onmessage = (e) => {
          if (e.data?.type === 'WORKFLOW_STATE_UPDATED') {
            setState(e.data.state)
          }
        }
      }
    } catch {}

    return () => {
      window.removeEventListener('agrilink:workflow-updated', handleSync)
      try {
        bc?.close()
      } catch {}
    }
  }, [])

  const handleGoToStage = (stageNum: number) => {
    const next = fastForwardToStage(stageNum)
    setState(next)
    onStageChange?.(stageNum)
  }

  const handleReset = () => {
    const reset = resetWorkflowToDemoBaseline()
    setState(reset)
    onStageChange?.(1)
  }

  const currentStageInfo = STAGES[state.stage - 1] || STAGES[0]

  return (
    <aside aria-label="SIH Primary Demo Progression" className="w-full bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-800 p-3.5 mb-5 space-y-3">
      {/* Top Banner Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                Primary Flow Demo Engine
              </span>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Stage {state.stage} of 7: {currentStageInfo.badge}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-semibold mt-0.5">
              400 kg declared → 392 kg scale → 370 kg accepted → 300 kg reserved → 70 kg remaining → dispatch 300 kg → ₹10,860 net
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {state.stage < 7 && (
            <button
              type="button"
              onClick={() => handleGoToStage(state.stage + 1)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              Next Milestone →
            </button>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset flow to baseline"
          >
            <RotateCcw className="size-3.5" />
            Reset Flow
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 text-xs border border-slate-700 font-bold"
          >
            {isExpanded ? 'Collapse' : 'Expand Steps'}
          </button>
        </div>
      </div>

      {/* Interactive 7-Step Progression Stepper */}
      {isExpanded && (
        <div className="pt-2 border-t border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {STAGES.map((s) => {
              const IconComp = s.icon
              const isPast = state.stage > s.num
              const isCurrent = state.stage === s.num

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => handleGoToStage(s.num)}
                  className={`p-2.5 rounded-xl text-left transition-all border cursor-pointer flex flex-col justify-between min-h-[78px] ${
                    isCurrent
                      ? 'bg-emerald-500/20 border-emerald-500/60 ring-1 ring-emerald-500/50 text-white'
                      : isPast
                      ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:bg-slate-800/40 hover:text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="font-bold text-[11px] leading-tight truncate">
                      {s.title}
                    </span>
                    {isPast ? (
                      <Check className="size-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <IconComp
                        className={`size-3.5 shrink-0 ${
                          isCurrent ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      />
                    )}
                  </div>

                  <div className="mt-1">
                    <span
                      className={`text-[10px] font-black block leading-tight ${
                        isCurrent ? 'text-emerald-300' : isPast ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {s.badge}
                    </span>
                    <span className="text-[9px] text-slate-400 leading-none mt-0.5 line-clamp-1 block">
                      {s.desc}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <Info className="size-3.5 text-emerald-400" />
              Latest Action: <strong className="text-slate-200">{state.lastAction}</strong>
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              Auto-Synced via BroadcastChannel across all browser tabs
            </span>
          </div>
        </div>
      )}
    </aside>
  )
}
