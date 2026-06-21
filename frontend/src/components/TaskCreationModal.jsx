import { useState } from 'react'
import { X, Rocket, Zap } from 'lucide-react'

const QUICK_LOADS = [
  {
    label: 'Build a weather forecast engine',
    goal:
      'Create a multi-agent pipeline that fetches weather data from OpenWeatherMap, runs a simple ML model to predict temperature trends for the next 24 hours, and outputs a formatted JSON forecast with confidence scores.',
  },
  {
    label: 'Create an NFT minting dApp',
    goal:
      'Design and deploy a smart-contract-backed NFT minting dApp where agent workers collaborate: one writes the Solidity contract, another builds the React frontend with Web3 integration, and a third tests the minting flow end-to-end.',
  },
  {
    label: 'Design a DeFi yield aggregator',
    goal:
      'Architect a DeFi yield aggregator that polls lending protocol APYs, simulates optimal allocation across Aave, Compound, and Yearn vaults, and produces a human-readable strategy report plus an on-chain transaction payload.',
  },
]

export default function TaskCreationModal({ isOpen, onClose, onPostTask, isLoading }) {
  const [goal, setGoal] = useState('')

  if (!isOpen) return null

  const handleQuickLoad = (sampleGoal) => {
    setGoal(sampleGoal)
  }

  const handleDeploy = async () => {
    if (!goal.trim()) return

    // Generate 2 mock sub-tasks with 0.05 ETH bounty each
    const subTask1 = JSON.stringify({ task: goal, bounty_eth: 0.05, variant: 'A' })
    const subTask2 = JSON.stringify({ task: goal, bounty_eth: 0.05, variant: 'B' })

    const metadata1 = `mock://task/${btoa(subTask1).slice(0, 40)}`
    const metadata2 = `mock://task/${btoa(subTask2).slice(0, 40)}`

    await onPostTask(goal, metadata1)
    await onPostTask(goal, metadata2)

    setGoal('')
    onClose()
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      {/* Modal Card */}
      <div className="relative w-full max-w-2xl mx-4 bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_40px_rgba(34,211,238,0.15)] animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Rocket size={18} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-cyan-400">
                Deploy Human Command to Swarm
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Submit a goal — agents decompose and execute autonomously
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Goal Textarea */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Zap size={13} className="text-cyan-400" />
              Mission Brief
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Describe what you want the agent swarm to accomplish..."
              rows={5}
              className="cyber-input resize-none font-mono text-sm text-slate-100 placeholder-slate-600"
              disabled={isLoading}
            />
          </div>

          {/* Quick-load Chips */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Quick-load Mission
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_LOADS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickLoad(q.goal)}
                  disabled={isLoading}
                  className="text-xs px-3 py-1.5 rounded-full border border-cyan-500/20 text-cyan-400/80 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-cyan-500/20 flex items-center justify-between">
          <p className="text-xs text-slate-600">
            Deploys 2 sub-tasks at 0.05 ETH each (0.1 ETH total escrow)
          </p>
          <button
            onClick={handleDeploy}
            disabled={!goal.trim() || isLoading}
            className="cyber-btn-primary flex items-center gap-2 btn-gradient-shine"
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Rocket size={14} />
                Deploy to Swarm
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
      `}</style>
    </div>
  )
}