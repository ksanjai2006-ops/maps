import { db } from './schema'
import type {
  SavedPlace, Note, Task, Contact, Expense,
  CalendarEvent, JournalEntry, Habit, HabitLog, Trip,
  Reminder, SyncQueueItem, PeerMessage, AppNotification, MapRegion
} from './schema'

const DEVICE_ID = (() => {
  const key = 'lifemap_device_id'
  let id = localStorage.getItem(key)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id) }
  return id
})()

async function addToSyncQueue(entityType: string, entityId: number, action: 'create' | 'update' | 'delete', payload: object) {
  const item: SyncQueueItem = {
    entityType, entityId, action,
    payload: JSON.stringify(payload),
    timestamp: new Date(),
    deviceId: DEVICE_ID,
    version: Date.now(),
    status: 'pending',
    retryCount: 0,
    errorMessage: null,
  }
  await db.syncQueue.add(item)
}

// ─── Places ────────────────────────────────────────────────────────────────
export const PlacesDB = {
  async getAll(): Promise<SavedPlace[]> {
    const items = await db.savedPlaces.toArray()
    return items.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  },
  async getById(id: number): Promise<SavedPlace | undefined> {
    return db.savedPlaces.get(id)
  },
  async getFavorites(): Promise<SavedPlace[]> {
    return db.savedPlaces.where('isFavorite').equals(1).toArray()
  },
  async getByCategory(cat: string): Promise<SavedPlace[]> {
    return db.savedPlaces.where('category').equals(cat).toArray()
  },
  async add(place: Omit<SavedPlace, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'remoteId'>): Promise<number> {
    const id = await db.savedPlaces.add({
      ...place, visitCount: 0, lastVisited: null,
      createdAt: new Date(), updatedAt: new Date(),
      syncStatus: 'local', remoteId: null
    })
    await addToSyncQueue('savedPlaces', id as number, 'create', place)
    return id as number
  },
  async update(id: number, changes: Partial<SavedPlace>): Promise<void> {
    await db.savedPlaces.update(id, { ...changes, updatedAt: new Date(), syncStatus: 'pending' })
    await addToSyncQueue('savedPlaces', id, 'update', changes)
  },
  async delete(id: number): Promise<void> {
    await db.savedPlaces.delete(id)
    await addToSyncQueue('savedPlaces', id, 'delete', { id })
  },
  async incrementVisit(id: number): Promise<void> {
    await db.savedPlaces.update(id, { visitCount: (await db.savedPlaces.get(id))!.visitCount + 1, lastVisited: new Date() })
  }
}

// ─── Notes ─────────────────────────────────────────────────────────────────
export const NotesDB = {
  async getAll(): Promise<Note[]> {
    return db.notes.where('isDeleted').equals(0).reverse().sortBy('updatedAt')
  },
  async getActive(): Promise<Note[]> {
    return db.notes.where({ isArchived: 0, isDeleted: 0 }).reverse().sortBy('updatedAt')
  },
  async getById(id: number): Promise<Note | undefined> {
    return db.notes.get(id)
  },
  async getPinned(): Promise<Note[]> {
    return db.notes.where({ isPinned: 1, isDeleted: 0 }).toArray()
  },
  async add(note: Partial<Note>): Promise<number> {
    const now = new Date()
    const id = await db.notes.add({
      title: '', content: '', type: 'text',
      checklistItems: [], tags: [], category: 'general',
      locationId: null, contactIds: [], isPinned: false,
      isLocked: false, isEncrypted: false, encryptedContent: null,
      isFavorite: false, isArchived: false, isDeleted: false,
      color: '#1A2340', photos: [],
      createdAt: now, updatedAt: now,
      syncStatus: 'local', remoteId: null,
      ...note
    })
    await addToSyncQueue('notes', id as number, 'create', note)
    return id as number
  },
  async update(id: number, changes: Partial<Note>): Promise<void> {
    await db.notes.update(id, { ...changes, updatedAt: new Date(), syncStatus: 'pending' })
    await addToSyncQueue('notes', id, 'update', changes)
  },
  async softDelete(id: number): Promise<void> {
    await db.notes.update(id, { isDeleted: true, deletedAt: new Date() })
  },
  async restore(id: number): Promise<void> {
    await db.notes.update(id, { isDeleted: false, deletedAt: null })
  }
}

// ─── Tasks ─────────────────────────────────────────────────────────────────
export const TasksDB = {
  async getAll(): Promise<Task[]> {
    const items = await db.tasks.toArray()
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },
  async getActive(): Promise<Task[]> {
    return db.tasks.where('isCompleted').equals(0).reverse().sortBy('createdAt')
  },
  async getToday(): Promise<Task[]> {
    const today = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    return db.tasks.where('deadline').between(today, tomorrow).toArray()
  },
  async add(task: Partial<Task>): Promise<number> {
    const id = await db.tasks.add({
      title: '', description: '', priority: 'medium', category: 'personal',
      deadline: null, isCompleted: false, completedAt: null,
      isRepeating: false, repeatRule: null, locationId: null,
      noteIds: [], tags: [], createdAt: new Date(), updatedAt: new Date(),
      syncStatus: 'local', remoteId: null, ...task
    })
    await addToSyncQueue('tasks', id as number, 'create', task)
    return id as number
  },
  async update(id: number, changes: Partial<Task>): Promise<void> {
    await db.tasks.update(id, { ...changes, updatedAt: new Date() })
  },
  async toggle(id: number): Promise<void> {
    const task = await db.tasks.get(id)
    if (!task) return
    await db.tasks.update(id, {
      isCompleted: !task.isCompleted,
      completedAt: !task.isCompleted ? new Date() : null,
      updatedAt: new Date()
    })
  },
  async delete(id: number): Promise<void> {
    await db.tasks.delete(id)
  }
}

// ─── Contacts ──────────────────────────────────────────────────────────────
export const ContactsDB = {
  async getAll(): Promise<Contact[]> {
    const items = await db.contacts.toArray()
    return items.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  },
  async getEmergency(): Promise<Contact[]> {
    return db.contacts.where('isEmergencyContact').equals(1).sortBy('emergencyOrder')
  },
  async add(contact: Partial<Contact>): Promise<number> {
    const id = await db.contacts.add({
      name: '', phone: '', email: '', address: '',
      category: 'other', notes: '', photo: null,
      isEmergencyContact: false, emergencyOrder: null,
      locationId: null, tags: [], birthday: null,
      createdAt: new Date(), updatedAt: new Date(),
      syncStatus: 'local', remoteId: null, ...contact
    })
    return id as number
  },
  async update(id: number, changes: Partial<Contact>): Promise<void> {
    await db.contacts.update(id, { ...changes, updatedAt: new Date() })
  },
  async delete(id: number): Promise<void> {
    await db.contacts.delete(id)
  }
}

// ─── Expenses ──────────────────────────────────────────────────────────────
export const ExpensesDB = {
  async getAll(): Promise<Expense[]> {
    return db.expenses.orderBy('date').reverse().toArray()
  },
  async getByDateRange(from: string, to: string): Promise<Expense[]> {
    return db.expenses.where('date').between(from, to, true, true).toArray()
  },
  async getThisMonth(): Promise<Expense[]> {
    const now = new Date()
    const from = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    const to = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10)
    return this.getByDateRange(from, to)
  },
  async add(expense: Partial<Expense>): Promise<number> {
    const id = await db.expenses.add({
      amount: 0, currency: 'INR', category: 'other',
      description: '', date: new Date().toISOString().slice(0,10),
      locationId: null, paymentMethod: 'cash', receiptPhoto: null,
      tags: [], tripId: null, createdAt: new Date(), updatedAt: new Date(),
      syncStatus: 'local', remoteId: null, ...expense
    })
    return id as number
  },
  async delete(id: number): Promise<void> {
    await db.expenses.delete(id)
  }
}

// ─── Calendar Events ────────────────────────────────────────────────────────
export const EventsDB = {
  async getAll(): Promise<CalendarEvent[]> {
    return db.calendarEvents.orderBy('start').toArray()
  },
  async getUpcoming(limit = 5): Promise<CalendarEvent[]> {
    const now = new Date()
    return db.calendarEvents.where('start').above(now).limit(limit).toArray()
  },
  async add(event: Partial<CalendarEvent>): Promise<number> {
    const now = new Date()
    const id = await db.calendarEvents.add({
      title: '', description: '', start: now, end: now,
      allDay: false, type: 'event', color: '#7c3aed',
      locationId: null, contactIds: [], noteIds: [],
      isRecurring: false, recurRule: null, reminder: null,
      createdAt: now, updatedAt: now, syncStatus: 'local', remoteId: null, ...event
    })
    return id as number
  },
  async update(id: number, changes: Partial<CalendarEvent>): Promise<void> {
    await db.calendarEvents.update(id, { ...changes, updatedAt: new Date() })
  },
  async delete(id: number): Promise<void> {
    await db.calendarEvents.delete(id)
  }
}

// ─── Journal ────────────────────────────────────────────────────────────────
export const JournalDB = {
  async getAll(): Promise<JournalEntry[]> {
    return db.journalEntries.orderBy('date').reverse().toArray()
  },
  async getByDate(date: string): Promise<JournalEntry | undefined> {
    return db.journalEntries.where('date').equals(date).first()
  },
  async add(entry: Partial<JournalEntry>): Promise<number> {
    const id = await db.journalEntries.add({
      date: new Date().toISOString().slice(0,10), mood: 3,
      title: '', content: '', achievements: [],
      weather: '', locationId: null, tags: [], photos: [],
      isPrivate: true, createdAt: new Date(), updatedAt: new Date(),
      syncStatus: 'local', ...entry
    })
    return id as number
  },
  async update(id: number, changes: Partial<JournalEntry>): Promise<void> {
    await db.journalEntries.update(id, { ...changes, updatedAt: new Date() })
  }
}

// ─── Habits ─────────────────────────────────────────────────────────────────
export const HabitsDB = {
  async getAll(): Promise<Habit[]> {
    const items = await db.habits.toArray()
    return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  },
  async add(habit: Partial<Habit>): Promise<number> {
    const id = await db.habits.add({
      name: '', description: '', icon: '✅', color: '#7c3aed',
      frequency: 'daily', targetCount: 1,
      createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', ...habit
    })
    return id as number
  },
  async logToday(habitId: number): Promise<void> {
    const date = new Date().toISOString().slice(0,10)
    const existing = await db.habitLogs.where({ habitId, date }).first()
    if (existing) {
      await db.habitLogs.update(existing.id!, { count: existing.count + 1 })
    } else {
      await db.habitLogs.add({ habitId, date, count: 1, note: '', createdAt: new Date() })
    }
  },
  async getLogsForDate(date: string): Promise<HabitLog[]> {
    return db.habitLogs.where('date').equals(date).toArray()
  },
  async getStreak(habitId: number): Promise<number> {
    const logs = await db.habitLogs.where('habitId').equals(habitId).sortBy('date')
    if (logs.length === 0) return 0
    let streak = 0
    const today = new Date()
    for (let i = 0; i <= 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0,10)
      const hasLog = logs.some(l => l.date === dateStr && l.count > 0)
      if (hasLog) streak++; else break
    }
    return streak
  }
}

// ─── Messages ───────────────────────────────────────────────────────────────
export const MessagesDB = {
  async getByThread(threadId: string): Promise<PeerMessage[]> {
    return db.peerMessages.where('threadId').equals(threadId).sortBy('timestamp')
  },
  async getAll(): Promise<PeerMessage[]> {
    return db.peerMessages.orderBy('timestamp').toArray()
  },
  async add(msg: Omit<PeerMessage, 'id'>): Promise<number> {
    return (await db.peerMessages.add(msg)) as number
  },
  async markDelivered(id: number): Promise<void> {
    await db.peerMessages.update(id, { status: 'delivered' })
  },
  async clearThread(threadId: string): Promise<void> {
    await db.peerMessages.where('threadId').equals(threadId).delete()
  }
}

// ─── Notifications ──────────────────────────────────────────────────────────
export const NotificationsDB = {
  async getAll(): Promise<AppNotification[]> {
    return db.notifications.orderBy('timestamp').reverse().toArray()
  },
  async getUnread(): Promise<AppNotification[]> {
    return db.notifications.where('isRead').equals(0).reverse().sortBy('timestamp')
  },
  async getUnreadCount(): Promise<number> {
    return db.notifications.where('isRead').equals(0).count()
  },
  async add(n: Omit<AppNotification, 'id'>): Promise<number> {
    return (await db.notifications.add(n)) as number
  },
  async markRead(id: number): Promise<void> {
    await db.notifications.update(id, { isRead: true })
  },
  async markAllRead(): Promise<void> {
    await db.notifications.toCollection().modify({ isRead: true })
  },
  async delete(id: number): Promise<void> {
    await db.notifications.delete(id)
  },
  async clear(): Promise<void> {
    await db.notifications.clear()
  }
}

// ─── Map Regions ────────────────────────────────────────────────────────────
export const MapRegionsDB = {
  async getAll(): Promise<MapRegion[]> {
    return db.mapRegions.toArray()
  },
  async add(region: Omit<MapRegion, 'id'>): Promise<number> {
    return (await db.mapRegions.add(region)) as number
  },
  async delete(id: number): Promise<void> {
    await db.mapRegions.delete(id)
  },
  async updateStatus(id: number, status: 'downloading' | 'ready' | 'error', sizeBytes?: number, tileCount?: number): Promise<void> {
    const changes: Partial<MapRegion> = { status }
    if (sizeBytes !== undefined) changes.sizeBytes = sizeBytes
    if (tileCount !== undefined) changes.tileCount = tileCount
    await db.mapRegions.update(id, changes)
  }
}

// ─── Seed Demo Data ─────────────────────────────────────────────────────────
export async function seedDemoData() {
  const count = await db.savedPlaces.count()
  if (count > 0) return // already seeded

  // Places
  await db.savedPlaces.bulkAdd([
    { name: 'Home', latitude: 13.0827, longitude: 80.2707, address: '123, Anna Nagar, Chennai', category: 'home', description: 'My home', notes: '', photos: [], tags: ['home'], visitCount: 10, lastVisited: new Date(), isFavorite: true, color: '#7c3aed', icon: '🏠', createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
    { name: 'Work Office', latitude: 13.0569, longitude: 80.2425, address: 'Guindy Industrial Estate, Chennai', category: 'work', description: 'My workplace', notes: 'Parking on B floor', photos: [], tags: ['work'], visitCount: 45, lastVisited: new Date(), isFavorite: true, color: '#06b6d4', icon: '🏢', createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
    { name: 'City Hospital', latitude: 13.0674, longitude: 80.2376, address: 'Park Town, Chennai', category: 'hospital', description: 'Nearest hospital', notes: 'Emergency: 044-2819-0000', photos: [], tags: ['hospital', 'emergency'], visitCount: 2, lastVisited: null, isFavorite: false, color: '#ef4444', icon: '🏥', createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
    { name: 'Central Library', latitude: 13.0700, longitude: 80.2758, address: 'Connaught Place, Chennai', category: 'college', description: 'Public library', notes: 'Open 9am - 6pm', photos: [], tags: ['study', 'library'], visitCount: 8, lastVisited: new Date(), isFavorite: true, color: '#f59e0b', icon: '📚', createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
  ] as SavedPlace[])

  // Notes
  await db.notes.bulkAdd([
    { title: 'Project Ideas', content: '## LifeMap Features\n- Offline maps\n- Personal notes\n- Emergency mode\n\nThis project has huge potential!', type: 'text', checklistItems: [], tags: ['project', 'ideas'], category: 'work', locationId: null, contactIds: [], isPinned: true, isLocked: false, isEncrypted: false, encryptedContent: null, isFavorite: true, isArchived: false, isDeleted: false, color: '#141C35', photos: [], createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
    { title: 'Weekly Groceries', content: '', type: 'checklist', checklistItems: [{ id: '1', text: 'Milk 2L', checked: true, createdAt: new Date() }, { id: '2', text: 'Bread', checked: false, createdAt: new Date() }, { id: '3', text: 'Eggs', checked: false, createdAt: new Date() }, { id: '4', text: 'Vegetables', checked: false, createdAt: new Date() }], tags: ['shopping', 'home'], category: 'personal', locationId: null, contactIds: [], isPinned: false, isLocked: false, isEncrypted: false, encryptedContent: null, isFavorite: false, isArchived: false, isDeleted: false, color: '#1A2340', photos: [], createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
    { title: 'Travel Plans — Goa', content: '**Planned**: December 2024\n\n### Things to do\n- Baga Beach\n- Fort Aguada\n- Old Goa Churches\n\n### Hotels\n- Taj Fort Aguada Resort', type: 'text', checklistItems: [], tags: ['travel', 'goa'], category: 'travel', locationId: null, contactIds: [], isPinned: false, isLocked: false, isEncrypted: false, encryptedContent: null, isFavorite: true, isArchived: false, isDeleted: false, color: '#0F1629', photos: [], createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
  ] as Note[])

  // Tasks
  await db.tasks.bulkAdd([
    { title: 'Complete project presentation', description: 'Finalize slides for Monday meeting', priority: 'urgent', category: 'work', deadline: new Date(Date.now() + 86400000), isCompleted: false, completedAt: null, isRepeating: false, repeatRule: null, locationId: null, noteIds: [], tags: ['work', 'project'], createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
    { title: 'Morning jog', description: '5km run', priority: 'medium', category: 'health', deadline: null, isCompleted: true, completedAt: new Date(), isRepeating: true, repeatRule: 'daily', locationId: null, noteIds: [], tags: ['health', 'fitness'], createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
    { title: 'Buy groceries', description: '', priority: 'low', category: 'personal', deadline: new Date(Date.now() + 172800000), isCompleted: false, completedAt: null, isRepeating: false, repeatRule: null, locationId: null, noteIds: [], tags: ['shopping'], createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
    { title: 'Call Dr. Sharma', description: 'Annual checkup appointment', priority: 'high', category: 'health', deadline: new Date(Date.now() + 259200000), isCompleted: false, completedAt: null, isRepeating: false, repeatRule: null, locationId: null, noteIds: [], tags: ['health', 'medical'], createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
  ] as Task[])

  // Contacts
  await db.contacts.bulkAdd([
    { name: 'Priya Sharma', phone: '+91 98765 43210', email: 'priya@email.com', address: 'T Nagar, Chennai', category: 'family', notes: 'Sister', photo: null, isEmergencyContact: true, emergencyOrder: 1, locationId: null, tags: ['family'], birthday: '1992-03-15', createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
    { name: 'Dr. Ramesh Kumar', phone: '+91 44 2819 0000', email: 'dr.ramesh@hospital.com', address: 'City Hospital, Park Town', category: 'medical', notes: 'Family Doctor', photo: null, isEmergencyContact: true, emergencyOrder: 2, locationId: null, tags: ['doctor', 'medical'], birthday: null, createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
    { name: 'Arjun Mehta', phone: '+91 87654 32109', email: 'arjun@work.com', address: 'Guindy, Chennai', category: 'work', notes: 'Team Lead', photo: null, isEmergencyContact: false, emergencyOrder: null, locationId: null, tags: ['work', 'colleague'], birthday: '1989-07-22', createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
  ] as Contact[])

  // Expenses (this month)
  const today = new Date().toISOString().slice(0,10)
  await db.expenses.bulkAdd([
    { amount: 450, currency: 'INR', category: 'food', description: 'Lunch at office', date: today, locationId: null, paymentMethod: 'upi', receiptPhoto: null, tags: ['food', 'office'], tripId: null, createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
    { amount: 1200, currency: 'INR', category: 'shopping', description: 'Groceries from supermarket', date: today, locationId: null, paymentMethod: 'card', receiptPhoto: null, tags: ['groceries'], tripId: null, createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
    { amount: 350, currency: 'INR', category: 'travel', description: 'Ola cab to office', date: today, locationId: null, paymentMethod: 'upi', receiptPhoto: null, tags: ['cab', 'commute'], tripId: null, createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
    { amount: 2500, currency: 'INR', category: 'bills', description: 'Electricity bill', date: today, locationId: null, paymentMethod: 'bank', receiptPhoto: null, tags: ['utility'], tripId: null, createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
    { amount: 800, currency: 'INR', category: 'entertainment', description: 'Movie tickets', date: today, locationId: null, paymentMethod: 'card', receiptPhoto: null, tags: ['movies', 'weekend'], tripId: null, createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local', remoteId: null },
  ] as Expense[])

  // Habits
  await db.habits.bulkAdd([
    { name: 'Morning Exercise', description: '30 min workout', icon: '🏃', color: '#10b981', frequency: 'daily', targetCount: 1, createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local' },
    { name: 'Read Books', description: 'Read for 20 minutes', icon: '📖', color: '#7c3aed', frequency: 'daily', targetCount: 1, createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local' },
    { name: 'Drink Water', description: '8 glasses of water', icon: '💧', color: '#06b6d4', frequency: 'daily', targetCount: 8, createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local' },
    { name: 'Meditate', description: '10 min meditation', icon: '🧘', color: '#f59e0b', frequency: 'daily', targetCount: 1, createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local' },
  ] as Habit[])

  // Emergency Profile
  await db.emergencyProfile.add({
    bloodGroup: 'O+', allergies: 'Penicillin', medications: 'None',
    medicalConditions: 'None', doctorName: 'Dr. Ramesh Kumar',
    doctorPhone: '+91 44 2819 0000', hospitalName: 'City Hospital',
    hospitalPhone: '+91 44 2819 0001', insuranceProvider: 'Star Health',
    insurancePolicyNumber: 'SH-2024-XXX-0001', organDonor: true,
    additionalNotes: 'In case of emergency, contact sister Priya first.',
    emergencyContacts: [
      { name: 'Priya Sharma', phone: '+91 98765 43210', relation: 'Sister' },
      { name: 'Dr. Ramesh Kumar', phone: '+91 44 2819 0000', relation: 'Family Doctor' }
    ],
    updatedAt: new Date()
  })

  // Journal entry for today
  await db.journalEntries.add({
    date: today, mood: 4,
    title: 'A productive day!',
    content: 'Worked on the LifeMap project today. Really excited about the offline-first approach. The design is coming together beautifully.',
    achievements: ['Completed project setup', 'Wrote 500 lines of code'],
    weather: 'Sunny', locationId: null, tags: ['productive', 'coding'],
    photos: [], isPrivate: true, createdAt: new Date(), updatedAt: new Date(), syncStatus: 'local'
  })

  // Notifications
  const notifCount = await db.notifications.count()
  if (notifCount === 0) {
    await db.notifications.bulkAdd([
      { title: 'Upcoming Task: Electricity Bill', message: 'Due in 2 days (₹2,500)', type: 'task', link: '/tasks', isRead: false, priority: 'high', timestamp: new Date() },
      { title: 'Habit Reminder: Drink Water', message: 'You have logged 3 of 8 glasses today. Keep going!', type: 'habit', link: '/tasks', isRead: false, priority: 'low', timestamp: new Date(Date.now() - 3600000) },
      { title: 'Calendar Event: Team Review', message: 'Tomorrow at 10:00 AM via video call', type: 'calendar', link: '/calendar', isRead: false, priority: 'medium', timestamp: new Date(Date.now() - 7200000) },
      { title: 'Offline Mode Active', message: 'LifeMap is ready for full offline navigation & vault security.', type: 'system', link: '/settings', isRead: true, priority: 'low', timestamp: new Date(Date.now() - 86400000) },
    ])
  }

  // Peer messages
  const msgCount = await db.peerMessages.count()
  if (msgCount === 0) {
    await db.peerMessages.bulkAdd([
      { threadId: 'broadcast', senderId: 'system', senderName: 'LifeMap Network', content: 'Local Offline Mesh is active. Devices on the same Wi-Fi or browser tabs can exchange peer messages without internet.', type: 'system', status: 'delivered', timestamp: new Date(Date.now() - 1800000) },
      { threadId: 'broadcast', senderId: 'peer_priya', senderName: 'Priya (Sister)', content: 'Hey, are you still near the hospital? Let me know once you reach home.', type: 'text', status: 'delivered', timestamp: new Date(Date.now() - 900000) },
      { threadId: 'sos', senderId: 'system', senderName: 'LifeMap Emergency Beacon', content: 'Emergency SOS Broadcast channel. Use the Broadcast SOS button to beacon your GPS coordinates to all nearby local devices.', type: 'system', status: 'delivered', timestamp: new Date(Date.now() - 3600000) },
    ])
  }
}
