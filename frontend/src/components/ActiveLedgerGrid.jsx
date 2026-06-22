import { useState, useCallback } from 'react'
import { ExternalLink, CheckCircle, Clock, Shield, Eye, Send, X, User } from 'lucide-react'
import { parseTaskName, parseResult, shortenAddress, textToDataURI } from '../utils/uriResolver'

// Custom status color mapping per spec
const STATUS_STYLES = {
  0: {
    label: 'Open',
    pillClass: 'bg-slate-500/15 text-slate-300 border-slate-500/25',
    glowClass: 'status-open border-l-4 border-l-slate-400',
    icon: Clock,
  },
  1: {
    label: 'Claimed',
    pillClass: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    glowClass: 'status-claimed border-l-4 border-l-amber-400',
    icon: User,
  },
  2: {
    label: 'Submitted',
    pillClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
    glowClass: 'status-submitted border-l-4 border-l-cyan-400',
    icon: Send,
  },
  3: {
    label: 'Completed',
    pillClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    glowClass: 'status-completed border-l-4 border-l-emerald-400',
    icon: CheckCircle,
  },
  4: {
    label: 'Disputed',
    pillClass: 'bg-red-500/15 text-red-400 border-red-500/25',
    glowClass: 'status-disputed border-l-4 border-l-red-400',
    icon: X,
  },
}

export default function ActiveLedgerGrid({
  tasks,
  wallet,
  onClaimTask,
  onApprove,
  onDispute,
  onSubmitResult,
  isLoading,
  formatEth,
}) {
  const [viewingResult, setViewingResult] = useState(null) // task object or null
  const [submittingTaskId, setSubmittingTaskId] = useState(null)
  const [submitText, setSubmitText] = useState('')

  const isConnected = !!wallet.address
  const myAddress = wallet.address?.toLowerCase() || ''

  const getStatusStyle = (status) => STATUS_STYLES[status] ?? STATUS_STYLES[0]

  const renderStatusPill = (task) => {
    const style = getStatusStyle(task.status)
    const Icon = style.icon
    const label = style.label

    let extraText = ''
    if (task.status === 1 && task.workerAgent) {
      extraText = ` · ${shortenAddress(task.workerAgent)}`
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${style.pillClass}`}
      >
        <Icon size={11} />
        {label}{extraText}
      </span>
    )
  }

  const renderResultCell = (task) => {
    if (!task.resultURI || task.resultURI === '') {
      return <span className="text-xs text-slate-600 italic">—</span>
    }

    if (task.resultURI.startsWith('data:')) {
      return (
        <button
          onClick={() => setViewingResult(task)}
          className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer group"
        >
          <Eye size={12} className="group-hover:scale-110 transition-transform" />
          <span className="underline underline-offset-2">AI Result</span>
        </button>
      )
    }

    if (task.resultURI.startsWith('mock:')) {
      return (
        <button
          onClick={() => setViewingResult(task)}
          className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer group max-w-[12rem]"
        >
          <span className="truncate">
            {task.resultURI.slice(0, 40)}
            {task.resultURI.length > 40 ? '...' : ''}
          </span>
          <Eye size={12} className="shrink-0 group-hover:scale-110 transition-transform" />
        </button>
      )
    }

    return (
      <a
        href={task.resultURI}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors max-w-32 truncate"
      >
        {task.resultURI.slice(0, 20)}
        {task.resultURI.length > 20 ? '...' : ''}
        <ExternalLink size={10} className="shrink-0" />
      </a>
    )
  }

  const renderActions = (task) => {
    const posterAddress = task.managerAgent?.toLowerCase()
    const workerAddress = task.workerAgent?.toLowerCase()
    const isPoster = myAddress === posterAddress
    const isWorker = myAddress === workerAddress

    // Status 0: Open
    if (task.status === 0) {
      if (!isConnected) return <span className="text-xs text-slate-600 italic">Connect wallet</span>
      if (isPoster) {
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-700/30 text-slate-400 border border-slate-600/20">
            <User size={11} />
            Yours
          </span>
        )
      }
      return (
        <button
          onClick={() => onClaimTask(task.taskId)}
          disabled={isLoading}
          className="text-xs px-3 py-1.5 rounded border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-gradient-shine"
        >
          Claim
        </button>
      )
    }

    // Status 1: Claimed
    if (task.status === 1) {
      if (isWorker) {
        return (
          <button
            onClick={() => {
              setSubmittingTaskId(task.taskId)
              setSubmitText('')
            }}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-gradient-shine"
          >
            <span className="inline-flex items-center gap-1.5">
              <Send size={11} />
              Submit
            </span>
          </button>
        )
      }
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Clock size={11} />
          In progress
        </span>
      )
    }

    // Status 2: Submitted
    if (task.status === 2) {
      if (isPoster) {
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onApprove(task.taskId)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-gradient-shine"
            >
              <span className="inline-flex items-center gap-1">
                <CheckCircle size={11} />
                Approve
              </span>
            </button>
            <button
              onClick={() => onDispute(task.taskId)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded border border-red-500/30 text-red-400/80 hover:bg-red-500/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-gradient-shine"
            >
              <span className="inline-flex items-center gap-1">
                <X size={11} />
                Dispute
              </span>
            </button>
          </div>
        )
      }
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Clock size={11} />
          Awaiting approval
        </span>
      )
    }

    // Status 3: Verified
    if (task.status === 3) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle size={11} />
          Completed
        </span>
      )
    }

    // Status 4: Disputed
    if (task.status === 4) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
          <X size={11} />
          Disputed
        </span>
      )
    }

    return null
  }

  const handleSubmitResultConfirm = useCallback(async () => {
    if (!submittingTaskId || !submitText.trim()) return
    const dataURI = textToDataURI(submitText.trim())
    await onSubmitResult(submittingTaskId, dataURI)
    setSubmittingTaskId(null)
    setSubmitText('')
  }, [submittingTaskId, submitText, onSubmitResult])

  const parsedResultContent = viewingResult ? parseResult(viewingResult.resultURI) : null

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
                <th className="pb-3 pr-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-10">
                  #
                </th>
                <th className="pb-3 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Task Name
                </th>
                <th className="pb-3 pr-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-24">
                  Bounty
                </th>
                <th className="pb-3 pr-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-36">
                  Status
                </th>
                <th className="pb-3 pr-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-32">
                  Worker
                </th>
                <th className="pb-3 pr-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-40">
                  Result
                </th>
                <th className="pb-3 text-xs font-medium text-slate-500 uppercase tracking-wider w-44">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/5">
              {tasks.map((task) => {
                const taskName = parseTaskName(task.taskMetadataURI)
                const style = getStatusStyle(task.status)
                return (
                  <tr
                    key={task.taskId}
                    className={`hover:bg-slate-800/50 transition-colors ${style.glowClass}`}
                  >
                    <td className="py-3 pr-3 font-mono text-cyan-400 text-xs">
                      #{task.taskId}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className="text-sm text-slate-200 line-clamp-2 leading-snug"
                        title={taskName}
                      >
                        {taskName.length > 80 ? `${taskName.slice(0, 80)}...` : taskName}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400">
                        {formatEth(task.reward)} ETH
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      {renderStatusPill(task)}
                    </td>
                    <td className="py-3 pr-3 font-mono text-xs text-slate-400">
                      {task.workerAgent && task.workerAgent !== '0x0000000000000000000000000000000000000000'
                        ? shortenAddress(task.workerAgent)
                        : 'Not claimed'}
                    </td>
                    <td className="py-3 pr-3">
                      {renderResultCell(task)}
                    </td>
                    <td className="py-3">
                      {renderActions(task)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="flex flex-col gap-4 md:hidden">
            {tasks.map((task) => {
              const taskName = parseTaskName(task.taskMetadataURI)
              const style = getStatusStyle(task.status)
              return (
                <div
                  key={task.taskId}
                  className={`task-card ${style.glowClass}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-cyan-400 text-xs">#{task.taskId}</span>
                    <div>{renderStatusPill(task)}</div>
                  </div>

                  <div className="mt-2">
                    <p className="text-sm text-slate-200 leading-snug" title={taskName}>
                      {taskName.length > 80 ? `${taskName.slice(0, 80)}...` : taskName}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mt-2">
                    <span className="text-slate-500">Bounty</span>
                    <span className="inline-flex items-start">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400">
                        {formatEth(task.reward)} ETH
                      </span>
                    </span>
                    <span className="text-slate-500">Worker</span>
                    <span className="font-mono text-slate-400">
                      {task.workerAgent && task.workerAgent !== '0x0000000000000000000000000000000000000000'
                        ? shortenAddress(task.workerAgent)
                        : 'Not claimed'}
                    </span>
                    <span className="text-slate-500">Result</span>
                    <div className="min-w-0">{renderResultCell(task)}</div>
                  </div>

                  <div className="pt-2 border-t border-cyan-500/10 mt-2">
                    {renderActions(task)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Result Viewer Modal ─── */}
      {viewingResult && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setViewingResult(null) }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative w-full max-w-2xl mx-4 bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_40px_rgba(34,211,238,0.15)] animate-scale-in flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 shrink-0">
              <h3 className="text-base font-semibold text-cyan-400">
                Result for Task #{viewingResult.taskId}
              </h3>
              <button
                onClick={() => setViewingResult(null)}
                className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-4 overflow-y-auto">
              <pre className="text-xs text-slate-300 whitespace-pre-wrap break-all bg-slate-950 p-4 rounded max-h-[24rem] overflow-y-auto border border-cyan-500/10">
                {parsedResultContent ?? 'Unable to decode result content.'}
              </pre>
            </div>
            {/* Footer */}
            <div className="px-6 py-3 border-t border-cyan-500/20 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-mono truncate max-w-[70%]">
                {viewingResult.resultURI}
              </span>
              <button
                onClick={() => setViewingResult(null)}
                className="cyber-btn text-xs px-4 py-1.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Result Submission Modal ─── */}
      {submittingTaskId !== null && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setSubmittingTaskId(null) }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative w-full max-w-xl mx-4 bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_40px_rgba(34,211,238,0.15)] animate-scale-in flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 shrink-0">
              <h3 className="text-base font-semibold text-cyan-400">
                Submit Result for Task #{submittingTaskId}
              </h3>
              <button
                onClick={() => setSubmittingTaskId(null)}
                className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-5 flex flex-col gap-3 overflow-y-auto">
              <label className="text-sm text-slate-400">
                Paste or type your result below. It will be encoded as a data URI and stored on-chain.
              </label>
              <textarea
                value={submitText}
                onChange={(e) => setSubmitText(e.target.value)}
                placeholder="Enter your task result here..."
                rows={8}
                className="cyber-input resize-none font-mono text-sm text-slate-100 placeholder-slate-600"
                disabled={isLoading}
              />
            </div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-cyan-500/20 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setSubmittingTaskId(null)}
                className="cyber-btn text-sm px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitResultConfirm}
                disabled={!submitText.trim() || isLoading}
                className="cyber-btn-primary text-sm px-4 py-2 flex items-center gap-2 btn-gradient-shine"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Submit Result
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
