import { ExternalLink, CheckCircle, AlertCircle, Clock, Shield } from 'lucide-react'

const STATUS_GLOW_CLASSES = {
  0: 'status-open border-l-4 border-l-sky-400',
  1: 'status-claimed border-l-4 border-l-yellow-400',
  2: 'status-submitted border-l-4 border-l-purple-400',
  3: 'status-completed border-l-4 border-l-green-400',
  4: 'status-disputed border-l-4 border-l-red-400',
}

const STATUS_PILL_ANIMATIONS = {
  0: 'animate-status-pulse',
  1: 'animate-status-pulse',
  2: '',
  3: '',
  4: 'animate-shake',
}

export default function ActiveLedgerGrid({
  tasks,
  wallet,
  onClaimTask,
  onApprove,
  onDispute,
  isLoading,
  STATUS_NAMES,
  STATUS_COLORS,
  formatEth,
}) {
  const truncate = (str, len = 12) =>
    str && str.length > len ? `${str.slice(0, len)}...` : str || '—'

  const renderStatusPill = (status) => {
    const colorClass = STATUS_COLORS[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    const animationClass = STATUS_PILL_ANIMATIONS[status] || ''
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${colorClass} ${animationClass}`}
      >
        {status === 0 && <Clock size={10} />}
        {status === 1 && <Clock size={10} />}
        {status === 2 && <AlertCircle size={10} />}
        {status === 3 && <CheckCircle size={10} />}
        {status === 4 && <AlertCircle size={10} />}
        {STATUS_NAMES[status] ?? `Status ${status}`}
      </span>
    )
  }

  const renderActions = (task) => {
    const actions = []
    const isManager = wallet.address && wallet.address.toLowerCase() === task.managerAgent?.toLowerCase()

    // Open → Claim
    if (task.status === 0 && wallet.address) {
      actions.push(
        <button
          key="claim"
          onClick={() => onClaimTask(task.taskId)}
          disabled={isLoading}
          className="text-xs px-3 py-1.5 rounded border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-gradient-shine"
        >
          Claim
        </button>
      )
    }

    // Submitted → Approve & Pay (manager only)
    if (task.status === 2 && isManager) {
      actions.push(
        <button
          key="approve"
          onClick={() => onApprove(task.taskId)}
          disabled={isLoading}
          className="text-xs px-3 py-1.5 rounded border border-green-500/30 text-green-400 hover:bg-green-500/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-gradient-shine"
        >
          Approve &amp; Pay
        </button>
      )
    }

    // Not Verified / Disputed → Dispute button
    if (task.status < 3) {
      actions.push(
        <button
          key="dispute"
          onClick={() => onDispute(task.taskId)}
          disabled={isLoading}
          className="text-xs px-3 py-1.5 rounded border border-red-500/30 text-red-400/80 hover:bg-red-500/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-gradient-shine"
        >
          Dispute
        </button>
      )
    }

    return <div className="flex gap-2 flex-wrap">{actions}</div>
  }

  const getStatusGlowClass = (status) => {
    return STATUS_GLOW_CLASSES[status] || 'border-l-4 border-l-slate-500'
  }

  return (
    <section className="cyber-card p-6" data-animate data-animate-delay="4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Shield size={20} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">The Immutable Swarm Ledger</h2>
          <p className="text-sm text-slate-500">Live on-chain task registry</p>
        </div>
      </div>

      {/* Loading shimmer overlay */}
      {isLoading && tasks.length === 0 && (
        <div className="mb-4 p-4 rounded-lg bg-slate-900/50 border border-cyan-500/10">
          <div className="h-4 w-48 rounded bg-gradient-to-r from-slate-800 via-cyan-500/10 to-slate-800 animate-shimmer mb-2" />
          <div className="h-3 w-32 rounded bg-gradient-to-r from-slate-800 via-cyan-500/10 to-slate-800 animate-shimmer" />
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="min-h-40 flex flex-col items-center justify-center text-slate-600 text-sm gap-3">
          <div className="text-4xl animate-float">🐝</div>
          <p className="text-center max-w-xs">
            No tasks in the swarm ledger yet. Deploy your first mission above!
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Desktop Table */}
          <table className="w-full text-sm hidden md:table">
            <thead>
              <tr className="border-b border-cyan-500/10 text-left">
                <th className="pb-3 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Task ID
                </th>
                <th className="pb-3 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Manager
                </th>
                <th className="pb-3 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Worker
                </th>
                <th className="pb-3 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Metadata URI
                </th>
                <th className="pb-3 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Result URI
                </th>
                <th className="pb-3 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Reward
                </th>
                <th className="pb-3 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="pb-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/5">
              {tasks.map((task) => (
                <tr
                  key={task.taskId}
                  className={`hover:bg-cyan-500/5 transition-all duration-200 ${getStatusGlowClass(task.status)}`}
                >
                  <td className="py-3 pr-4 font-mono text-cyan-400 text-xs">
                    #{task.taskId}
                  </td>
                  <td className="py-3 pr-4 font-mono text-slate-400 text-xs">
                    {truncate(task.managerAgent)}
                  </td>
                  <td className="py-3 pr-4 font-mono text-slate-400 text-xs">
                    {truncate(task.workerAgent) || '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <a
                      href={task.taskMetadataURI}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors max-w-32 truncate"
                      title={task.taskMetadataURI}
                    >
                      {truncate(task.taskMetadataURI, 20)}
                      <ExternalLink size={10} className="shrink-0" />
                    </a>
                  </td>
                  <td className="py-3 pr-4">
                    {task.resultURI ? (
                      <a
                        href={task.resultURI}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors max-w-32 truncate"
                        title={task.resultURI}
                      >
                        {truncate(task.resultURI, 20)}
                        <ExternalLink size={10} className="shrink-0" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600 italic">Pending</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-xs text-slate-300">
                    {formatEth(task.reward)} ETH
                  </td>
                  <td className="py-3 pr-4">{renderStatusPill(task.status)}</td>
                  <td className="py-3">{renderActions(task)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="flex flex-col gap-4 md:hidden">
            {tasks.map((task) => (
              <div
                key={task.taskId}
                className={`task-card ${getStatusGlowClass(task.status)}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-cyan-400 text-xs">#{task.taskId}</span>
                  <div className="status-glow">{renderStatusPill(task.status)}</div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-slate-500">Manager</span>
                  <span className="font-mono text-slate-400 truncate">{truncate(task.managerAgent)}</span>
                  <span className="text-slate-500">Worker</span>
                  <span className="font-mono text-slate-400 truncate">
                    {truncate(task.workerAgent) || '—'}
                  </span>
                  <span className="text-slate-500">Reward</span>
                  <span className="text-slate-300">{formatEth(task.reward)} ETH</span>
                  <span className="text-slate-500">Metadata</span>
                  <a
                    href={task.taskMetadataURI}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors truncate"
                    title={task.taskMetadataURI}
                  >
                    {truncate(task.taskMetadataURI, 18)}
                    <ExternalLink size={10} />
                  </a>
                  <span className="text-slate-500">Result</span>
                  {task.resultURI ? (
                    <a
                      href={task.resultURI}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors truncate"
                    >
                      {truncate(task.resultURI, 18)}
                      <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span className="text-slate-600 italic">Pending</span>
                  )}
                </div>
                <div className="pt-1 border-t border-cyan-500/10">{renderActions(task)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}