import { Activity, Users, Coins } from 'lucide-react'

const WORKER_COLORS = [
  'border-green-400 text-green-400 shadow-[0_0_16px_rgba(52,211,153,0.3)]',
  'border-blue-400 text-blue-400 shadow-[0_0_16px_rgba(96,165,250,0.3)]',
  'border-purple-400 text-purple-400 shadow-[0_0_16px_rgba(167,139,250,0.3)]',
  'border-yellow-400 text-yellow-400 shadow-[0_0_16px_rgba(251,191,36,0.3)]',
]

export default function SwarmVisualizer({ tasks, formatEth, STATUS_NAMES }) {
  const totalTasks = tasks.length
  const activeWorkers = tasks.filter((t) => t.status === 1 || t.status === 2).length
  const pendingRewards = tasks
    .filter((t) => t.status === 0)
    .reduce((sum, t) => sum + BigInt(t.reward), 0n)

  const workerCount = Math.max(Math.min(totalTasks, 4), 1)

  return (
    <section className="cyber-card p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Activity size={20} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">🐝 Live Swarm Topology</h2>
          <p className="text-sm text-slate-500">Autonomous agent network status</p>
        </div>
      </div>

      {/* Animated Nodes */}
      <div className="relative flex flex-wrap items-center justify-center gap-8 py-6 min-h-44">
        {/* Connector Lines — CSS pseudo-elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
          <div className="absolute left-1/2 top-[30%] -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />
          <div className="absolute left-1/2 top-[70%] -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
        </div>

        {/* Manager Node */}
        <div className="flex flex-col items-center gap-2 z-10">
          <div className="manager-node">
            <span className="text-lg">🤖</span>
          </div>
          <span className="text-xs font-medium text-cyan-400">Manager Agent</span>
          <span className="text-xs text-slate-600">Coordinator</span>
        </div>

        {/* Arrow / Hub */}
        <div className="flex flex-col items-center gap-1 z-10">
          <div className="hub-node">
            <span className="text-sm">⚡</span>
          </div>
        </div>

        {/* Worker Nodes */}
        {Array.from({ length: workerCount }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 z-10">
            <div className={`worker-node ${WORKER_COLORS[i % WORKER_COLORS.length]}`}>
              <span className="text-sm">🔧</span>
            </div>
            <span className={`text-xs font-medium ${WORKER_COLORS[i % WORKER_COLORS.length].split(' ')[1]}`}>
              Worker-{i + 1}
            </span>
            <span className="text-xs text-slate-600">
              {tasks[i]?.status !== undefined ? STATUS_NAMES[tasks[i].status] : 'Idle'}
            </span>
          </div>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-900/60 border border-cyan-500/10">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Activity size={13} />
            <span className="text-lg font-bold font-mono">{totalTasks}</span>
          </div>
          <span className="text-xs text-slate-500 text-center">Total Tasks</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-900/60 border border-green-500/10">
          <div className="flex items-center gap-1.5 text-green-400">
            <Users size={13} />
            <span className="text-lg font-bold font-mono">{activeWorkers}</span>
          </div>
          <span className="text-xs text-slate-500 text-center">Active Workers</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-900/60 border border-yellow-500/10">
          <div className="flex items-center gap-1.5 text-yellow-400">
            <Coins size={13} />
            <span className="text-lg font-bold font-mono">
              {pendingRewards > 0n ? formatEth(pendingRewards) : '0'}
            </span>
          </div>
          <span className="text-xs text-slate-500 text-center">Pending ETH</span>
        </div>
      </div>

      <style>{`
        @keyframes manager-pulse {
          0%, 100% {
            box-shadow: 0 0 8px rgba(34,211,238,0.3), 0 0 20px rgba(34,211,238,0.1);
            border-color: rgba(34,211,238,0.4);
          }
          50% {
            box-shadow: 0 0 16px rgba(34,211,238,0.5), 0 0 40px rgba(34,211,238,0.2);
            border-color: rgba(34,211,238,0.7);
          }
        }
        @keyframes worker-pulse {
          0%, 100% {
            box-shadow: 0 0 6px currentColor;
            opacity: 0.85;
          }
          50% {
            box-shadow: 0 0 14px currentColor;
            opacity: 1;
          }
        }
        @keyframes hub-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .manager-node {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(34,211,238,0.15), rgba(34,211,238,0.05));
          border: 2px solid rgba(34,211,238,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          animation: manager-pulse 2.5s ease-in-out infinite;
        }
        .worker-node {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
          border: 2px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: worker-pulse 2s ease-in-out infinite;
        }
        .worker-node:nth-child(odd) {
          animation-delay: 0.3s;
        }
        .worker-node:nth-child(even) {
          animation-delay: 0.7s;
        }
        .hub-node {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(251,191,36,0.1);
          border: 1.5px solid rgba(251,191,36,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: hub-spin 3s linear infinite;
        }
      `}</style>
    </section>
  )
}