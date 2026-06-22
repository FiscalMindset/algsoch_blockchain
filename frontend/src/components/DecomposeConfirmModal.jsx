import { useEffect, useCallback } from 'react'
import { X, Rocket, BrainCircuit } from 'lucide-react'

export default function DecomposeConfirmModal({ tasks, isOpen, onConfirm, onCancel }) {
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }, [onCancel])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const totalBounty = tasks.reduce((sum, t) => sum + (parseFloat(t.bounty_eth) || 0.05), 0)

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      {/* Modal Card */}
      <div className="relative w-full max-w-2xl mx-4 bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_40px_rgba(34,211,238,0.15)] animate-scale-in flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-cyan-500/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <BrainCircuit size={18} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-cyan-400">
                {tasks.length > 0
                  ? `AI Decomposed Your Goal into ${tasks.length} Task${tasks.length !== 1 ? 's' : ''}`
                  : 'Decomposed Tasks'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and confirm before deploying to the swarm
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-3 overflow-y-auto">
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              No tasks to display.
            </p>
          ) : (
            tasks.map((task, index) => (
              <div
                key={task.id ?? index}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/50 border border-cyan-500/10 hover:border-cyan-500/20 transition-colors"
              >
                <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold mt-0.5">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 leading-snug">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mr-2 align-text-top">
                      TASK
                    </span>
                    {task.description}
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400">
                  {task.bounty_eth ?? 0.05} ETH
                </span>
              </div>
            ))
          )}

          <div className="flex items-center justify-between pt-2 border-t border-cyan-500/10">
            <span className="text-xs text-slate-500">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Total escrow: <span className="text-cyan-400">{totalBounty.toFixed(3)} ETH</span>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-cyan-500/20 flex items-center justify-between shrink-0">
          <button
            onClick={onCancel}
            className="cyber-btn text-sm flex items-center gap-2"
          >
            <X size={14} />
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={tasks.length === 0}
            className="cyber-btn-primary flex items-center gap-2 btn-gradient-shine"
          >
            <Rocket size={14} />
            Confirm &amp; Deploy
          </button>
        </div>
      </div>
    </div>
  )
}
