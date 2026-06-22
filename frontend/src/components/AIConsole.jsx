import { useState } from 'react'
import { ChevronDown, ChevronUp, Terminal } from 'lucide-react'

function formatRelativeTime(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function AgentLogRow({ log }) {
  const isManager = log.agent?.toLowerCase().includes('manager')
  const colorClass = isManager ? 'text-emerald-400' : 'text-cyan-400'
  const icon = isManager ? '🧠' : '🐝'
  const agentLabel = isManager ? 'Manager' : log.agent || 'Worker'

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-slate-800/50 transition-colors">
      <span className="text-sm select-none">{icon}</span>
      <span className="text-xs font-mono shrink-0 opacity-70">
        {log.timestamp ? formatRelativeTime(log.timestamp) : ''}
      </span>
      <span className={`text-xs font-mono ${colorClass} shrink-0`}>
        {agentLabel}
      </span>
      <span className="text-xs font-mono text-slate-500">→</span>
      <span className="text-xs font-mono text-slate-300 break-words min-w-0">
        {log.action}{log.taskId !== undefined ? ` Task #${log.taskId}` : ''}
        {log.snippet ? `: ${log.snippet}` : ''}
      </span>
    </div>
  )
}

/**
 * AIConsole
 *
 * A collapsible terminal-style panel showing recent AI/Agent actions.
 *
 * Props:
 *   logs: Array of { agent, action, taskId?, snippet?, timestamp }
 */
export default function AIConsole({ logs = [] }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <section className="cyber-card p-0 overflow-hidden" data-animate data-animate-delay="4">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Terminal size={18} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">AI Console</h3>
            <p className="text-xs text-slate-500">
              Agent thought process &amp; recent AI outputs
            </p>
          </div>
        </div>
        <span className="text-slate-500">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>

      {/* Terminal body */}
      {expanded && (
        <div className="bg-black/60 border-t border-slate-700/50 max-h-64 overflow-y-auto p-3">
          {logs.length === 0 ? (
            <p className="text-xs text-slate-600 font-mono text-center py-4 italic">
              Waiting for agent logs...
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {logs.map((log, idx) => (
                <AgentLogRow key={idx} log={log} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
