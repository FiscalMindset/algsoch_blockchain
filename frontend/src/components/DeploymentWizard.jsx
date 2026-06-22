import { useMemo } from 'react'
import { CheckCircle2 } from 'lucide-react'

const STEPS = [
  { id: 'decompose', label: '🧠 AI Decomposing Goal', description: 'Analyzing and breaking into subtasks (may take 20–30s)...' },
  { id: 'posting',   label: '📋 Posting Tasks to Escrow',       description: 'Locking ETH bounties on-chain...' },
  { id: 'claiming',  label: '🐝 Swarm Claiming Tasks',         description: 'Workers detecting and claiming...' },
  { id: 'executing', label: '⚡ Agents Executing',              description: 'NVIDIA AI generating results...' },
  { id: 'submit',    label: '📤 Results Submitted',              description: 'Waiting for manager approval...' },
  { id: 'approve',   label: '✅ Approved & Paid',               description: 'All rewards released!' },
]

const STEP_LINE_CLASS = 'absolute left-[11px] top-6 bottom-0 w-px bg-gradient-to-b'

function StepDot({ state }) {
  if (state === 'completed') {
    return (
      <div className="shrink-0 w-6 h-6 flex items-center justify-center">
        <CheckCircle2 size={20} className="text-emerald-400" />
      </div>
    )
  }
  if (state === 'active') {
    return (
      <div className="shrink-0 w-6 h-6 flex items-center justify-center">
        <span className="inline-block w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.6)]" />
      </div>
    )
  }
  return (
    <div className="shrink-0 w-6 h-6 flex items-center justify-center">
      <span className="inline-block w-2 h-2 rounded-full bg-slate-600" />
    </div>
  )
}

export default function DeploymentWizard({ tasks, isDeploying, deploymentStartTime }) {
  const allVerified = tasks.length > 0 && tasks.every((t) => t.status === 3)

  const shouldShow = isDeploying || (tasks.length > 0 && !allVerified)

  const activeIndex = useMemo(() => {
    if (allVerified) return 5
    if (tasks.some((t) => t.status === 2)) return 4
    if (tasks.some((t) => t.status === 1)) return 3
    if (!isDeploying && tasks.some((t) => t.status === 0)) return 2
    if (isDeploying) {
      // If no tasks posted yet, we're still in decomposition phase
      if (tasks.length === 0) return 0
      // Tasks exist → we're posting them
      if (deploymentStartTime && Date.now() - deploymentStartTime < 3000) return 0
      return 1
    }
    return 1
  }, [tasks, isDeploying, deploymentStartTime, allVerified])

  if (!shouldShow) return null

  return (
    <div className="cyber-card p-6 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <span className="text-lg">🚀</span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-100">Deployment Wizard</h3>
          <p className="text-xs text-slate-500">Real-time deployment lifecycle</p>
        </div>
      </div>

      <div className="flex flex-col gap-0 relative">
        {STEPS.map((step, index) => {
          const state = index < activeIndex ? 'completed' : index === activeIndex ? 'active' : 'pending'
          const isLast = index === STEPS.length - 1
          const labelClass =
            state === 'completed'
              ? 'text-emerald-400'
              : state === 'active'
              ? 'text-cyan-300'
              : 'text-slate-500'

          return (
            <div key={step.id} className="relative flex gap-3 py-3 first:pt-0 last:pb-0">
              {!isLast && (
                <div
                  className={`${STEP_LINE_CLASS} ${
                    state === 'completed'
                      ? 'from-emerald-500/40 to-emerald-500/10'
                      : state === 'active'
                      ? 'from-cyan-500/40 to-slate-700/30'
                      : 'from-slate-700/30 to-slate-700/30'
                  }`}
                />
              )}

              <StepDot state={state} />

              <div className="flex flex-col gap-0.5 min-w-0">
                <span className={`text-sm font-semibold transition-colors duration-300 ${labelClass}`}>
                  {step.label}
                </span>
                <span className="text-xs text-slate-500 transition-colors duration-300">
                  {step.description}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
