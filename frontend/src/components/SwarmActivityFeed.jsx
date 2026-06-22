import { useState, useEffect, useRef } from 'react'
import { formatEth } from '../utils/contracts'

function formatRelativeTime(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

function Dot({ type }) {
  const colorClass =
    type === 'info'
      ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]'
      : type === 'worker'
      ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]'
      : type === 'manager'
      ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
      : 'bg-slate-400'
  return <span className={`inline-block w-2 h-2 rounded-full ${colorClass} shrink-0 mt-1.5`} />
}

export default function SwarmActivityFeed({ tasks, transactions }) {
  const [entries, setEntries] = useState([])
  const prevTasksRef = useRef([])
  const prevTxLenRef = useRef(0)
  const bottomRef = useRef(null)

  // Add a new entry and auto-remove after 60s
  const addEntry = (message, type) => {
    const id = Date.now() + Math.random()
    setEntries((prev) => [...prev, { id, message, type, timestamp: Date.now() }])
    setTimeout(() => {
      setEntries((prev) => prev.filter((e) => e.id !== id))
    }, 60000)
  }

  // Detect task transitions and new transactions
  useEffect(() => {
    const prevTasks = prevTasksRef.current
    const currentTasks = tasks

    // New tasks posted
    if (currentTasks.length > prevTasks.length) {
      const addedCount = currentTasks.length - prevTasks.length
      addEntry(`Manager Agent posted ${addedCount} new task(s) to escrow`, 'info')
    }

    // Status transitions
    const prevMap = new Map(prevTasks.map((t) => [t.taskId, t.status]))
    for (const task of currentTasks) {
      const prevStatus = prevMap.get(task.taskId)
      if (prevStatus !== undefined && prevStatus !== task.status) {
        if (prevStatus === 0 && task.status === 1) {
          addEntry(`Worker Agent claimed Task #${task.taskId}`, 'worker')
        } else if (prevStatus === 1 && task.status === 2) {
          addEntry(`Worker Agent submitted result for Task #${task.taskId}`, 'worker')
        } else if (prevStatus === 2 && task.status === 3) {
          const reward = formatEth(task.reward)
          addEntry(`Manager Agent approved Task #${task.taskId} — ${reward} ETH released`, 'manager')
        }
      }
    }

    // New transactions
    if (transactions.length > prevTxLenRef.current && prevTxLenRef.current > 0) {
      const newTx = transactions[transactions.length - 1]
      addEntry(`${newTx.step} — ${newTx.status}`, 'tx')
    }
    prevTxLenRef.current = transactions.length
    prevTasksRef.current = currentTasks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, transactions])

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [entries.length])

  return (
    <section className="cyber-card p-6" data-animate data-animate-delay="3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <span className="text-lg">🐝</span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">Swarm Activity Feed</h3>
            <p className="text-xs text-slate-500">Live agent-level event stream</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-slate-600 italic">Waiting for swarm activity...</p>
          <p className="text-xs text-slate-700 mt-1">
            Post a task to see agent events appear here.
          </p>
        </div>
      ) : (
        <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pr-1 space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-900/40 border border-slate-700/30 transition-all duration-300 animate-fade-in-up"
            >
              <Dot type={entry.type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm text-slate-300">{entry.message}</span>
                  <span className="text-xs text-slate-600 shrink-0">
                    {formatRelativeTime(entry.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </section>
  )
}
