import { db } from '@/db/schema'
import { NotificationsDB } from '@/db/operations'

class NotificationScheduler {
  private timer: any = null
  private notifiedItems: Set<string> = new Set()

  init() {
    if (typeof window === 'undefined') return
    // Initial check after 3 seconds
    setTimeout(() => this.runCheck(), 3000)
    // Recurring check every 60 seconds
    this.timer = setInterval(() => this.runCheck(), 60000)
  }

  destroy() {
    if (this.timer) clearInterval(this.timer)
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false
    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch {
      return false
    }
  }

  hasPermission(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  }

  async sendNativeNotification(title: string, options?: NotificationOptions) {
    if (this.hasPermission()) {
      try {
        new Notification(title, {
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          ...options
        })
      } catch (e) {
        console.warn('Native notification failed', e)
      }
    }
  }

  async triggerTestNotification() {
    const title = '🔔 LifeMap Notification Check'
    const msg = 'Offline notifications are operational! Tasks, calendar, and habit reminders are active.'
    await NotificationsDB.add({
      title,
      message: msg,
      type: 'system',
      link: '/dashboard',
      isRead: false,
      priority: 'medium',
      timestamp: new Date()
    })
    this.sendNativeNotification(title, { body: msg })
  }

  private async runCheck() {
    try {
      const now = new Date()
      const todayStr = now.toISOString().slice(0, 10)

      // 1. Check Tasks due soon (< 24 hours)
      const tasks = await db.tasks.where('isCompleted').equals(0).toArray()
      for (const t of tasks) {
        if (t.deadline) {
          const deadline = new Date(t.deadline)
          const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
          const key = `task_${t.id}_${todayStr}`

          if (diffHours > 0 && diffHours <= 24 && !this.notifiedItems.has(key)) {
            this.notifiedItems.add(key)
            const title = `Task Deadline Approaching: ${t.title}`
            const msg = `Due in ${Math.round(diffHours)} hours (Priority: ${t.priority.toUpperCase()})`

            await NotificationsDB.add({
              title,
              message: msg,
              type: 'task',
              link: '/tasks',
              isRead: false,
              priority: t.priority === 'urgent' || t.priority === 'high' ? 'high' : 'medium',
              timestamp: new Date()
            })

            this.sendNativeNotification(title, { body: msg })
          }
        }
      }

      // 2. Check Calendar Events today
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      const events = await db.calendarEvents
        .where('start')
        .between(startOfDay, endOfDay)
        .toArray()

      for (const ev of events) {
        const key = `event_${ev.id}_${todayStr}`
        if (!this.notifiedItems.has(key)) {
          this.notifiedItems.add(key)
          const evTime = new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          const title = `Event Today: ${ev.title}`
          const msg = `Scheduled at ${evTime} (${ev.type})`

          await NotificationsDB.add({
            title,
            message: msg,
            type: 'calendar',
            link: '/calendar',
            isRead: false,
            priority: 'medium',
            timestamp: new Date()
          })

          this.sendNativeNotification(title, { body: msg })
        }
      }

      // 3. Check Habits reminder in late afternoon/evening
      const currentHour = now.getHours()
      if (currentHour >= 18) {
        const habits = await db.habits.toArray()
        const logsToday = await db.habitLogs.where('date').equals(todayStr).toArray()
        const loggedHabitIds = new Set(logsToday.filter(l => l.count > 0).map(l => l.habitId))

        const pendingHabits = habits.filter(h => !loggedHabitIds.has(h.id!))
        const habitKey = `habits_evening_${todayStr}`

        if (pendingHabits.length > 0 && !this.notifiedItems.has(habitKey)) {
          this.notifiedItems.add(habitKey)
          const title = `Habit Streak Reminder`
          const msg = `You have ${pendingHabits.length} habit(s) left to log today (${pendingHabits.map(h => h.name).slice(0, 2).join(', ')}...)`

          await NotificationsDB.add({
            title,
            message: msg,
            type: 'habit',
            link: '/tasks',
            isRead: false,
            priority: 'low',
            timestamp: new Date()
          })

          this.sendNativeNotification(title, { body: msg })
        }
      }
    } catch (err) {
      console.warn('Notification scheduler check failed', err)
    }
  }
}

export const notificationScheduler = new NotificationScheduler()
