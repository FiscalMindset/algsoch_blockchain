import { createContext, useContext, useState, useCallback, useRef } from 'react'

// ─── Notification Types ──────────────────────────────────────────────────────
//
// Shape of a notification:
// {
//   id: string,
//   type: 'info' | 'success' | 'warning' | 'error',
//   title: string,
//   message: string,
//   agentIcon: string,
//   timestamp: Date,
//   persistent: boolean,
//   actions: [{ label, onClick }],
// }

const MAX_NOTIFICATIONS = 5

function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

// ─── Context ─────────────────────────────────────────────────────────────────
export const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const timersRef = useRef(new Map())

  const cleanupTimer = useCallback((id) => {
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id))
      timersRef.current.delete(id)
    }
  }, [])

  const addNotification = useCallback((notification) => {
    const id = generateId()
    const entry = {
      id,
      type: notification.type ?? 'info',
      title: notification.title ?? '',
      message: notification.message ?? '',
      agentIcon: notification.agentIcon ?? '🚀',
      timestamp: new Date(),
      persistent: notification.persistent ?? false,
      actions: notification.actions ?? [],
    }

    setNotifications((prev) => {
      // Add new one to the front
      const next = [entry, ...prev]

      // If over max, drop oldest non-persistent notifications
      if (next.length > MAX_NOTIFICATIONS) {
        let trimmed = [...next]
        while (trimmed.length > MAX_NOTIFICATIONS) {
          const oldestIndex = trimmed.findLastIndex((n) => !n.persistent)
          if (oldestIndex !== -1) {
            const removedId = trimmed[oldestIndex].id
            // Clean up any pending timer for the removed notification
            if (timersRef.current.has(removedId)) {
              clearTimeout(timersRef.current.get(removedId))
              timersRef.current.delete(removedId)
            }
            trimmed.splice(oldestIndex, 1)
          } else {
            // All are persistent — drop the real oldest (last element)
            const removedId = trimmed[trimmed.length - 1].id
            if (timersRef.current.has(removedId)) {
              clearTimeout(timersRef.current.get(removedId))
              timersRef.current.delete(removedId)
            }
            trimmed.pop()
          }
        }
        return trimmed
      }
      return next
    })

    // Auto-dismiss non-persistent after 5000ms
    if (!entry.persistent) {
      const timer = setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
        timersRef.current.delete(id)
      }, 5000)
      timersRef.current.set(id, timer)
    }

    return id
  }, [])

  const dismissNotification = useCallback((id) => {
    cleanupTimer(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [cleanupTimer])

  const clearNotifications = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer))
    timersRef.current.clear()
    setNotifications([])
  }, [])

  const value = {
    notifications,
    addNotification,
    dismissNotification,
    clearNotifications,
    maxNotifications: MAX_NOTIFICATIONS,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return ctx
}
