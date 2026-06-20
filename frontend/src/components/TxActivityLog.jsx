import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronRight, ExternalLink, Loader2, CheckCircle2, XCircle } from 'lucide-react'

const ETHERSCAN_BASE = 'https://sepolia.etherscan.io/tx/'

function formatRelativeTime(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

function StatusIcon({ status }) {
  if (status === 'pending') {
    return (
      <div className="shrink-0 w-5 h-5 flex items-center justify-center">
        <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
      </div>
    )
  }
  if (status === 'success') {
    return (
      <div className="shrink-0 w-5 h-5 flex items-center justify-center">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      </div>
    )
  }
  return (
    <div className="shrink-0 w-5 h-5 flex items-center justify-center">
      <XCircle className="w-4 h-4 text-red-400" />
    </div>
  )
}

function TxHashLink({ hash }) {
  // For local/hardhat chains, just show truncated hash without link
  const truncated = hash ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : null
  if (!hash) return null

  // Hardhat chain (31337) - just show hash, no explorer link
  return (
    <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-500">
      <ExternalLink className="w-3 h-3" />
      {truncated}
    </span>
  )
}

function LogEntry({ entry }) {
  const [relTime, setRelTime] = useState(() => formatRelativeTime(entry.timestamp))

  useEffect(() => {
    const interval = setInterval(() => {
      setRelTime(formatRelativeTime(entry.timestamp))
    }, 5000)
    return () => clearInterval(interval)
  }, [entry.timestamp])

  const bgClass =
    entry.status === 'pending'
      ? 'bg-cyan-950/30 border-cyan-500/20'
      : entry.status === 'success'
      ? 'bg-emerald-950/30 border-emerald-500/20'
      : 'bg-red-950/30 border-red-500/20'

  const stepClass =
    entry.status === 'pending'
      ? 'text-cyan-300'
      : entry.status === 'success'
      ? 'text-emerald-300'
      : 'text-red-300'

  return (
    <div className={`flex gap-3 p-3 rounded-lg border ${bgClass} transition-all duration-300`}>
      <StatusIcon status={entry.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${stepClass}`}>{entry.step}</span>
          <span className="text-xs text-slate-500 shrink-0">{relTime}</span>
        </div>
        {entry.message && (
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{entry.message}</p>
        )}
        {entry.hash && (
          <div className="mt-2">
            <TxHashLink hash={entry.hash} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function TxActivityLog({ transactions }) {
  const [collapsed, setCollapsed] = useState(false)
  const bottomRef = useRef(null)
  const prevLenRef = useRef(0)

  // Auto-scroll to newest entry
  useEffect(() => {
    if (transactions.length > prevLenRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    prevLenRef.current = transactions.length
  }, [transactions.length])

  const pending = transactions.filter((t) => t.status === 'pending').length
  const done = transactions.filter((t) => t.status !== 'pending').length

  return (
    <section className="rounded-xl border border-slate-800/50 bg-slate-950/60 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-5 py-4 flex items-center justify-between bg-gradient-to-r from-slate-900/80 to-transparent hover:from-slate-900 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📡</span>
          <div className="text-left">
            <h3 className="text-base font-semibold text-slate-100">Transaction Activity</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {transactions.length === 0
                ? 'No on-chain activity yet.'
                : `${done} confirmed · ${pending} pending`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pending > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-400 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Live
            </span>
          )}
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </button>

      {/* Timeline */}
      {!collapsed && (
        <div className="px-4 pb-4">
          {transactions.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-600 italic">No on-chain activity yet.</p>
              <p className="text-xs text-slate-700 mt-1">
                Click "Deploy to Swarm" to see transaction steps appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pr-1">
              {transactions.map((tx) => (
                <LogEntry key={tx.id} entry={tx} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      )}
    </section>
  )
}