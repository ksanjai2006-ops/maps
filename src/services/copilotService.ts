import { db } from '@/db/schema'
import type { Task, Expense, CalendarEvent, SavedPlace, Contact, Note, EmergencyProfile } from '@/db/schema'

export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  intent?: string
  dataCards?: CopilotDataCard[]
  suggestions?: string[]
}

export interface CopilotDataCard {
  type: 'tasks' | 'expenses' | 'calendar' | 'emergency' | 'places' | 'notes'
  title: string
  items: Array<{
    id: number | string
    primary: string
    secondary: string
    badge?: string
    badgeColor?: string
    actionLink?: string
    phone?: string
  }>
}

export class OfflineCopilotEngine {
  async processQuery(query: string): Promise<CopilotMessage> {
    const q = query.toLowerCase().trim()
    const now = new Date()

    // ─── 1. Emergency & Health ──────────────────────────────────────────────
    if (
      q.includes('emergency') || q.includes('sos') || q.includes('blood') ||
      q.includes('doctor') || q.includes('hospital') || q.includes('allerg') ||
      q.includes('medical') || q.includes('helpline')
    ) {
      const profile = await db.emergencyProfile.toCollection().first()
      const emergencyContacts = await db.contacts.where('isEmergencyContact').equals(1).toArray()

      const cards: CopilotDataCard[] = []

      if (profile || emergencyContacts.length > 0) {
        cards.push({
          type: 'emergency',
          title: '🚨 Emergency Contacts & Medical Info',
          items: [
            ...(profile ? [
              { id: 'blood', primary: `Blood Group: ${profile.bloodGroup}`, secondary: `Allergies: ${profile.allergies || 'None'} | Doctor: ${profile.doctorName}` },
              { id: 'hosp', primary: `Hospital: ${profile.hospitalName}`, secondary: profile.hospitalPhone, phone: profile.hospitalPhone }
            ] : []),
            ...emergencyContacts.map(c => ({
              id: c.id!,
              primary: `${c.name} (${c.category})`,
              secondary: c.phone,
              badge: 'Tap to Call',
              badgeColor: '#ef4444',
              phone: c.phone
            }))
          ]
        })
      }

      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Here is your emergency medical information and priority contacts. You can tap on any contact to initiate an immediate call, or open the **Emergency** mode for high-contrast GPS transmission.`,
        timestamp: new Date(),
        intent: 'emergency',
        dataCards: cards,
        suggestions: ['Show doctor phone', 'National Helplines', 'Open Emergency SOS']
      }
    }

    // ─── 2. Finances & Expenses ─────────────────────────────────────────────
    if (
      q.includes('expense') || q.includes('spent') || q.includes('spending') ||
      q.includes('money') || q.includes('cost') || q.includes('budget') ||
      q.includes('rupee') || q.includes('food') || q.includes('bill')
    ) {
      const expenses = await db.expenses.toArray()
      const total = expenses.reduce((sum, e) => sum + e.amount, 0)

      // Category breakdown
      const byCategory: Record<string, number> = {}
      expenses.forEach(e => {
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
      })

      const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]

      const recent = expenses.slice(-5).reverse()

      const cards: CopilotDataCard[] = [{
        type: 'expenses',
        title: `Financial Summary (Total: ₹${total.toLocaleString()})`,
        items: recent.map(e => ({
          id: e.id!,
          primary: e.description,
          secondary: `${e.date} • ${e.paymentMethod.toUpperCase()}`,
          badge: `₹${e.amount}`,
          badgeColor: '#ef4444',
          actionLink: '/expenses'
        }))
      }]

      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `You have recorded a total of **₹${total.toLocaleString()}** across ${expenses.length} transactions. Your highest expenditure category is **${topCategory ? topCategory[0] : 'N/A'}** with **₹${topCategory ? topCategory[1].toLocaleString() : 0}**.`,
        timestamp: new Date(),
        intent: 'expenses',
        dataCards: cards,
        suggestions: ['Show expenses breakdown', 'Log a new expense', 'Check upcoming bills']
      }
    }

    // ─── 3. Schedule & Calendar ─────────────────────────────────────────────
    if (
      q.includes('calendar') || q.includes('event') || q.includes('schedule') ||
      q.includes('today') || q.includes('meeting') || q.includes('agenda') ||
      q.includes('tomorrow') || q.includes('plan')
    ) {
      const events = await db.calendarEvents.toArray()
      const sorted = events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

      const cards: CopilotDataCard[] = [{
        type: 'calendar',
        title: 'Upcoming Calendar Events',
        items: sorted.slice(0, 5).map(ev => ({
          id: ev.id!,
          primary: ev.title,
          secondary: `${new Date(ev.start).toLocaleDateString()} at ${new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          badge: ev.type,
          badgeColor: ev.color || '#7c3aed',
          actionLink: '/calendar'
        }))
      }]

      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: events.length > 0
          ? `You have **${events.length} event(s)** on your calendar schedule:`
          : `You don't have any calendar events scheduled right now. Tap "Add Event" to plan your week.`,
        timestamp: new Date(),
        intent: 'calendar',
        dataCards: cards,
        suggestions: ['Create new event', 'Show today’s tasks', 'View full calendar']
      }
    }

    // ─── 4. Tasks & Habits ──────────────────────────────────────────────────
    if (
      q.includes('task') || q.includes('todo') || q.includes('habit') ||
      q.includes('priority') || q.includes('pending') || q.includes('work') ||
      q.includes('done') || q.includes('checklist')
    ) {
      const tasks = await db.tasks.toArray()
      const pending = tasks.filter(t => !t.isCompleted)
      const highPriority = pending.filter(t => t.priority === 'urgent' || t.priority === 'high')

      const cards: CopilotDataCard[] = [{
        type: 'tasks',
        title: `Pending Tasks (${pending.length} remaining)`,
        items: pending.slice(0, 5).map(t => ({
          id: t.id!,
          primary: t.title,
          secondary: t.description || 'No description',
          badge: t.priority.toUpperCase(),
          badgeColor: t.priority === 'urgent' || t.priority === 'high' ? '#ef4444' : '#10b981',
          actionLink: '/tasks'
        }))
      }]

      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `You have **${pending.length} pending task(s)**, with **${highPriority.length} high/urgent priority** item(s). Keeping up momentum today!`,
        timestamp: new Date(),
        intent: 'tasks',
        dataCards: cards,
        suggestions: ['Show high priority tasks', 'Check habits streak', 'Add new task']
      }
    }

    // ─── 5. Places & Locations ──────────────────────────────────────────────
    if (
      q.includes('place') || q.includes('map') || q.includes('location') ||
      q.includes('where') || q.includes('address') || q.includes('home') ||
      q.includes('office') || q.includes('navigate')
    ) {
      const places = await db.savedPlaces.toArray()
      const favorites = places.filter(p => p.isFavorite)

      const cards: CopilotDataCard[] = [{
        type: 'places',
        title: 'Saved Places & Locations',
        items: (favorites.length > 0 ? favorites : places).slice(0, 5).map(p => ({
          id: p.id!,
          primary: `${p.icon} ${p.name}`,
          secondary: p.address,
          badge: p.category,
          badgeColor: p.color || '#06b6d4',
          actionLink: '/map'
        }))
      }]

      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `You have **${places.length} saved location(s)** with **${favorites.length} marked as favorites**. Click on any location to view it on the offline map.`,
        timestamp: new Date(),
        intent: 'places',
        dataCards: cards,
        suggestions: ['Show favorite places', 'Open Map', 'Download offline region']
      }
    }

    // ─── 6. Notes & Knowledge Base ──────────────────────────────────────────
    if (
      q.includes('note') || q.includes('memo') || q.includes('idea') ||
      q.includes('write') || q.includes('search') || q.includes('find')
    ) {
      const notes = await db.notes.where('isDeleted').equals(0).toArray()
      const pinned = notes.filter(n => n.isPinned)

      const cards: CopilotDataCard[] = [{
        type: 'notes',
        title: 'Important Notes',
        items: (pinned.length > 0 ? pinned : notes).slice(0, 5).map(n => ({
          id: n.id!,
          primary: n.title || 'Untitled Note',
          secondary: n.content.slice(0, 80) + '...',
          badge: n.tags[0] || 'Note',
          badgeColor: n.color || '#7c3aed',
          actionLink: '/notes'
        }))
      }]

      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `You have **${notes.length} saved note(s)** in your offline knowledge base (${pinned.length} pinned).`,
        timestamp: new Date(),
        intent: 'notes',
        dataCards: cards,
        suggestions: ['Search notes', 'Create new note', 'Open Vault']
      }
    }

    // ─── 7. Default Overview ────────────────────────────────────────────────
    const [tasksCount, placesCount, notesCount, expensesCount] = await Promise.all([
      db.tasks.where('isCompleted').equals(0).count(),
      db.savedPlaces.count(),
      db.notes.where('isDeleted').equals(0).count(),
      db.expenses.count()
    ])

    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Hello! I am **LifeMap Copilot**, your private offline intelligence assistant. I analyze your local IndexedDB to provide immediate answers without any internet access.

Here is your life summary right now:
- **Pending Tasks:** ${tasksCount} items
- **Saved Places:** ${placesCount} locations
- **Knowledge Notes:** ${notesCount} documents
- **Tracked Expenses:** ${expensesCount} transactions

What would you like to review?`,
      timestamp: new Date(),
      intent: 'general',
      suggestions: [
        'What are my urgent tasks?',
        'How much did I spend this week?',
        'Show emergency contacts',
        'Where is my home location?'
      ]
    }
  }
}

export const copilotEngine = new OfflineCopilotEngine()
