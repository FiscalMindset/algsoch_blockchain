import { useState, useEffect, useRef } from 'react'
import { Activity, Users, Coins } from 'lucide-react'

const WORKER_COLORS = [
  { border: 'border-green-400', text: 'text-green-400', glow: 'rgba(52,211,153,0.3)' },
  { border: 'border-blue-400', text: 'text-blue-400', glow: 'rgba(96,165,250,0.3)' },
  { border: 'border-purple-400', text: 'text-purple-400', glow: 'rgba(167,139,250,0.3)' },
  { border: 'border-yellow-400', text: 'text-yellow-400', glow: 'rgba(251,191,36,0.3)' },
]

function NodeTooltip({ node, position }) {
  if (!node) return null

  return (
    <div
      className="fixed z-50 px-3 py-2 rounded-lg bg-slate-900/95 border border-cyan-500/40 shadow-lg shadow-cyan-500/20 pointer-events-none"
      style={{
        left: position.x + 'px',
        top: position.y + 'px',
        transform: 'translate(-50%, -100%) translateY(-10px)',
      }}
    >
      <div className="text-xs font-semibold text-cyan-400 mb-1">{node.label}</div>
      <div className="text-xs text-slate-400">
        <div>Tasks claimed: <span className="text-slate-300">{node.tasks}</span></div>
        <div>Status: <span className="text-green-400">{node.status}</span></div>
      </div>
      {/* Tooltip arrow */}
      <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-full">
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-cyan-500/40" />
      </div>
    </div>
  )
}

export default function SwarmVisualizer({ tasks, formatEth, STATUS_NAMES }) {
  const [activeWorker, setActiveWorker] = useState(0)
  const [tooltip, setTooltip] = useState({ show: false, node: null, position: { x: 0, y: 0 } })
  const containerRef = useRef(null)
  const workerRefs = useRef([])

  const totalTasks = tasks.length
  const activeWorkers = tasks.filter((t) => t.status === 1 || t.status === 2).length
  const pendingRewards = tasks
    .filter((t) => t.status === 0)
    .reduce((sum, t) => sum + BigInt(t.reward), 0n)

  const workerCount = Math.max(Math.min(totalTasks || 4, 4), 1)

  // Cycle active worker every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWorker((prev) => (prev + 1) % workerCount)
    }, 3000)
    return () => clearInterval(interval)
  }, [workerCount])

  const handleNodeClick = (e, nodeData) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({
      show: true,
      node: nodeData,
      position: { x: rect.left + rect.width / 2, y: rect.top },
    })
  }

  const handleNodeLeave = () => {
    setTooltip({ show: false, node: null, position: { x: 0, y: 0 } })
  }

  // Build worker task data
  const getWorkerData = (index) => {
    const task = tasks[index]
    const tasksClaimed = task ? 1 : 0
    const status = task ? STATUS_NAMES[task.status] : 'Idle'
    return {
      label: `Worker ${index + 1}`,
      tasks: tasksClaimed,
      status,
    }
  }

  return (
    <section className="cyber-card p-6 flex flex-col gap-5" data-animate data-animate-delay="1">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Activity size={20} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Live Swarm Topology</h2>
          <p className="text-sm text-slate-500">Autonomous agent network status</p>
        </div>
      </div>

      {/* Animated Nodes */}
      <div ref={containerRef} className="relative flex flex-wrap items-center justify-center gap-6 md:gap-8 py-6 min-h-44">
        {/* Connector Lines with Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Manager to hub */}
          <div className="absolute left-[20%] top-[40%] w-[10%] h-px">
            <svg width="100%" height="2" className="absolute top-0 left-0">
              <line x1="0" y1="1" x2="100%" y2="1" stroke="rgba(34,211,238,0.4)" strokeWidth="2" strokeDasharray="4 4" className="connection-line" />
            </svg>
          </div>
          {/* Hub to workers */}
          {Array.from({ length: workerCount }).map((_, i) => (
            <div
              key={i}
              className="absolute left-[45%] top-[40%]"
              style={{
                transform: `rotate(${(i * 30) - (workerCount * 15)}deg)`,
                transformOrigin: '0 0',
              }}
            >
              <svg width="60px" height="2" className="absolute">
                <line
                  x1="0"
                  y1="1"
                  x2="60"
                  y2="1"
                  stroke={WORKER_COLORS[i % WORKER_COLORS.length].glow}
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  className="connection-line"
                />
              </svg>
            </div>
          ))}
          {/* Pulse effect on active connection */}
          <div className="absolute left-[20%] top-[40%] w-[20%] h-px">
            <div
              className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-cyan-400 to-transparent rounded-full animate-pulse"
              style={{ width: '50%' }}
            />
          </div>
        </div>

        {/* Manager Node */}
        <div
          className="swarm-node flex flex-col items-center gap-2 z-10"
          onClick={(e) => handleNodeClick(e, { label: 'Manager Agent', tasks: totalTasks, status: 'Active' })}
          onMouseLeave={handleNodeLeave}
        >
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
        {Array.from({ length: workerCount }).map((_, i) => {
          const color = WORKER_COLORS[i % WORKER_COLORS.length]
          const isActive = i === activeWorker
          const workerData = getWorkerData(i)

          return (
            <div
              key={i}
              className="swarm-node flex flex-col items-center gap-2 z-10"
              onClick={(e) => handleNodeClick(e, workerData)}
              onMouseLeave={handleNodeLeave}
            >
              <div
                ref={(el) => (workerRefs.current[i] = el)}
                className={`worker-node ${color.border} ${color.text} ${isActive ? 'active' : ''}`}
                style={{
                  boxShadow: isActive
                    ? `0 0 20px ${color.glow}, 0 0 40px ${color.glow}`
                    : `0 0 16px ${color.glow}`,
                }}
              >
                <span className="text-sm">🔧</span>
              </div>
              <span className={`text-xs font-medium ${color.text}`}>
                Worker-{i + 1}
              </span>
              <span className="text-xs text-slate-600">
                {workerData.status}
              </span>
            </div>
          )
        })}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-900/60 border border-cyan-500/10 hover:border-cyan-500/30 transition-colors">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Activity size={13} />
            <span className="text-lg font-bold font-mono">{totalTasks}</span>
          </div>
          <span className="text-xs text-slate-500 text-center">Total Tasks</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-900/60 border border-green-500/10 hover:border-green-500/30 transition-colors">
          <div className="flex items-center gap-1.5 text-green-400">
            <Users size={13} />
            <span className="text-lg font-bold font-mono">{activeWorkers}</span>
          </div>
          <span className="text-xs text-slate-500 text-center">Active Workers</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-900/60 border border-yellow-500/10 hover:border-yellow-500/30 transition-colors">
          <div className="flex items-center gap-1.5 text-yellow-400">
            <Coins size={13} />
            <span className="text-lg font-bold font-mono">
              {pendingRewards > 0n ? formatEth(pendingRewards) : '0'}
            </span>
          </div>
          <span className="text-xs text-slate-500 text-center">Pending ETH</span>
        </div>
      </div>

      {/* Tooltip */}
      <NodeTooltip node={tooltip.node} position={tooltip.position} />

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
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        .manager-node:hover {
          transform: scale(1.1);
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
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .worker-node:nth-child(odd) {
          animation-delay: 0.3s;
        }
        .worker-node:nth-child(even) {
          animation-delay: 0.7s;
        }
        .worker-node:hover {
          filter: brightness(1.3);
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