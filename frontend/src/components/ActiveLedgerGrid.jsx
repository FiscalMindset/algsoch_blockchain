import { ExternalLink, CheckCircle, AlertCircle, Clock, Shield } from 'lucide-react'

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
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${colorClass}`}
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
          className="text-xs px-3 py-1 rounded border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
          className="text-xs px-3 py-1 rounded border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
          className="text-xs px-3 py-1 rounded border border-red-500/30 text-red-400/80 hover:bg-red-500/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Dispute
        </button>
      )
    }

    return <div className="flex gap-2 flex-wrap">{actions}</div>
  }

  return (
    <section className="cyber-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Shield size={20} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">📜 The Immutable Swarm Ledger</h2>
          <p className="text-sm text-slate-500">Live on-chain task registry</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="min-h-40 flex flex-col items-center justify-center text-slate-600 text-sm gap-3">
          <div className="text-4xl">🐝</div>
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
                <tr key={task.taskId} className="hover:bg-cyan-500/5 transition-colors">
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
                className="border border-cyan-500/10 rounded-lg p-4 bg-slate-900/50 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-cyan-400 text-xs">#{task.taskId}</span>
                  {renderStatusPill(task.status)}
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