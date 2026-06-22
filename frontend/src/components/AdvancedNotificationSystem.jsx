import { useState, useEffect, useCallback } from 'react'
import { useNotifications } from '../context/NotificationContext'
import { X, CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-react'

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

const TYPE_CONFIG = {
  info: {
    border: 'border-l-cyan-400',
    progress: 'bg-cyan-500/40',
    icon: Info,
    iconClass: 'text-cyan-400',
  },
  success: {
    border: 'border-l-emerald-400',
    progress: 'bg-emerald-500/40',
    icon: CheckCircle2,
    iconClass: 'text-emerald-400',
  },
  warning: {
    border: 'border-l-yellow-400',
    progress: 'bg-yellow-500/40',
    icon: AlertTriangle,
    iconClass: 'text-yellow-400',
  },
  error: {
    border: 'border-l-red-400',
    progress: 'bg-red-500/40',
    icon: XCircle,
    iconClass: 'text-red-400',
  },
}

function NotificationCard({ notification, onDismiss }) {
  const [exiting, setExiting] = useState(false)
  const [relativeTime, setRelativeTime] = useState(
    formatRelativeTime(notification.timestamp)
  )

  // Update relative time every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(notification.timestamp))
    }, 5000)
    return () => clearInterval(interval)
  }, [notification.timestamp])

  const handleDismiss = useCallback(() => {
    setExiting(true)
    // Wait for exit animation before removing from state
    setTimeout(() => onDismiss(notification.id), 200)
  }, [notification.id, onDismiss])

  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.info
  const Icon = config.icon

  return (
    <div
      className={
        `pointer-events-auto relative overflow-hidden ` +
        `bg-slate-900/95 backdrop-blur border border-slate-700/50 rounded-lg shadow-xl p-3 ` +
        `border-l-[3px] ${config.border} ` +
        `${exiting ? 'animate-fade-out-scale' : 'animate-slide-in-right'}`
      }
    >
      {/* Top row */}
      <div className="flex items-start gap-2.5 pr-5">
        {/* Agent icon / type icon */}
        <span className="text-lg shrink-0 leading-none pt-0.5">{notification.agentIcon}</span>

        {/* Title + message */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-slate-100 leading-tight">
              {notification.title}
            </h4>
            <span className="text-[10px] text-slate-500 shrink-0">
              {relativeTime}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-snug">
            {notification.message}
          </p>
        </div>

        {/* X button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-0.5 rounded text-slate-500 hover:text-white transition-colors cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>

      {/* Action buttons */}
      {notification.actions && notification.actions.length > 0 && (
        <div className="flex items-center justify-end gap-2 mt-2 pt-1.5 border-t border-slate-700/40">
          {notification.actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                action.onClick?.()
              }}
              className="text-[10px] px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-colors cursor-pointer"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Progress bar for auto-dismiss */}
      {!notification.persistent && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5">
          <div className={`h-full ${config.progress} animate-shrink-progress`} />
        </div>
      )}
    </div>
  )
}

export default function AdvancedNotificationSystem() {
  const { notifications, dismissNotification } = useNotifications()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col-reverse gap-2 max-w-sm max-h-[80vh] overflow-y-auto pointer-events-none">
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onDismiss={dismissNotification}
        />
      ))}
    </div>
  )
}
