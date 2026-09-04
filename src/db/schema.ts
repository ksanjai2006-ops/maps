import Dexie, { type Table } from 'dexie'

// ─── Entity Types ──────────────────────────────────────────────────────────

export interface UserSettings {
  id?: number
  theme: 'dark' | 'light'
  accentColor: string
  dashboardWidgets: string[]
  defaultMapCenter: [number, number]
  defaultMapZoom: number
  language: string
  currency: string
  emergencyPin: string | null
  vaultPin: string | null
  autoLockMinutes: number
  notificationsEnabled: boolean
  locationEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SavedPlace {
  id?: number
  name: string
  latitude: number
  longitude: number
  address: string
  category: PlaceCategory
  description: string
  notes: string
  photos: string[]      // base64 data URLs
  tags: string[]
  visitCount: number
  lastVisited: Date | null
  isFavorite: boolean
  color: string
  icon: string
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  remoteId: string | null
}

export type PlaceCategory =
  | 'home' | 'work' | 'college' | 'hospital' | 'police'
  | 'pharmacy' | 'restaurant' | 'hotel' | 'friend' | 'family'
  | 'shopping' | 'parking' | 'travel' | 'custom'

export interface Note {
  id?: number
  title: string
  content: string        // markdown/rich text
  type: 'text' | 'checklist'
  checklistItems: ChecklistItem[]
  tags: string[]
  category: string
  locationId: number | null
  contactIds: number[]
  isPinned: boolean
  isLocked: boolean
  isEncrypted: boolean
  encryptedContent: string | null
  isFavorite: boolean
  isArchived: boolean
  isDeleted: boolean
  color: string
  photos: string[]
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
  syncStatus: SyncStatus
  remoteId: string | null
}

export interface ChecklistItem {
  id: string
  text: string
  checked: boolean
  createdAt: Date
}

export interface Task {
  id?: number
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  deadline: Date | null
  isCompleted: boolean
  completedAt: Date | null
  isRepeating: boolean
  repeatRule: string | null   // 'daily' | 'weekly' | 'monthly'
  locationId: number | null
  noteIds: number[]
  tags: string[]
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  remoteId: string | null
}

export interface Reminder {
  id?: number
  title: string
  message: string
  datetime: Date
  isRecurring: boolean
  recurRule: string | null
  locationId: number | null
  isTriggered: boolean
  isDismissed: boolean
  taskId: number | null
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
}

export interface Habit {
  id?: number
  name: string
  description: string
  icon: string
  color: string
  frequency: 'daily' | 'weekly'
  targetCount: number  // per period
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
}

export interface HabitLog {
  id?: number
  habitId: number
  date: string   // YYYY-MM-DD
  count: number
  note: string
  createdAt: Date
}

export interface JournalEntry {
  id?: number
  date: string   // YYYY-MM-DD
  mood: MoodLevel
  title: string
  content: string
  achievements: string[]
  weather: string
  locationId: number | null
  tags: string[]
  photos: string[]
  isPrivate: boolean
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
}

export type MoodLevel = 1 | 2 | 3 | 4 | 5

export interface Contact {
  id?: number
  name: string
  phone: string
  email: string
  address: string
  category: ContactCategory
  notes: string
  photo: string | null   // base64
  isEmergencyContact: boolean
  emergencyOrder: number | null
  locationId: number | null
  tags: string[]
  birthday: string | null
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  remoteId: string | null
}

export type ContactCategory =
  | 'family' | 'friend' | 'work' | 'medical' | 'emergency' | 'other'

export interface Expense {
  id?: number
  amount: number
  currency: string
  category: ExpenseCategory
  description: string
  date: string   // YYYY-MM-DD
  locationId: number | null
  paymentMethod: PaymentMethod
  receiptPhoto: string | null   // base64
  tags: string[]
  tripId: number | null
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  remoteId: string | null
}

export type ExpenseCategory =
  | 'food' | 'travel' | 'shopping' | 'education'
  | 'bills' | 'entertainment' | 'health' | 'other'

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank' | 'other'

export interface CalendarEvent {
  id?: number
  title: string
  description: string
  start: Date
  end: Date
  allDay: boolean
  type: EventType
  color: string
  locationId: number | null
  contactIds: number[]
  noteIds: number[]
  isRecurring: boolean
  recurRule: string | null
  reminder: number | null   // minutes before
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  remoteId: string | null
}

export type EventType =
  | 'event' | 'reminder' | 'birthday' | 'travel'
  | 'exam' | 'meeting' | 'personal'

export interface Trip {
  id?: number
  name: string
  destination: string
  startDate: string    // YYYY-MM-DD
  endDate: string
  description: string
  budget: number
  currency: string
  status: 'planned' | 'active' | 'completed'
  coverPhoto: string | null
  placeIds: number[]
  notes: string
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  remoteId: string | null
}

export interface EmergencyProfile {
  id?: number
  bloodGroup: string
  allergies: string
  medications: string
  medicalConditions: string
  doctorName: string
  doctorPhone: string
  hospitalName: string
  hospitalPhone: string
  insuranceProvider: string
  insurancePolicyNumber: string
  organDonor: boolean
  additionalNotes: string
  emergencyContacts: EmergencyContact[]
  updatedAt: Date
}

export interface EmergencyContact {
  name: string
  phone: string
  relation: string
}

export interface VaultItem {
  id?: number
  category: VaultCategory
  label: string
  encryptedData: string   // AES encrypted JSON blob
  icon: string
  createdAt: Date
  updatedAt: Date
}

export type VaultCategory =
  | 'personal' | 'address' | 'document' | 'vehicle'
  | 'academic' | 'work' | 'insurance' | 'financial' | 'other'

export interface SyncQueueItem {
  id?: number
  entityType: string
  entityId: number
  action: 'create' | 'update' | 'delete'
  payload: string   // JSON
  timestamp: Date
  deviceId: string
  version: number
  status: 'pending' | 'syncing' | 'synced' | 'error'
  retryCount: number
  errorMessage: string | null
}

export type SyncStatus = 'local' | 'synced' | 'pending' | 'error'

export interface MapRegion {
  id?: number
  name: string
  bounds: { north: number; south: number; east: number; west: number }
  minZoom: number
  maxZoom: number
  downloadedAt: Date
  sizeBytes: number
  tileCount: number
  status: 'downloading' | 'ready' | 'error'
}

export interface PeerMessage {
  id?: number
  threadId: string
  senderId: string
  senderName: string
  recipientId?: string
  content: string
  type: 'text' | 'sos' | 'location' | 'system'
  location?: { lat: number; lng: number }
  status: 'sent' | 'delivered' | 'pending'
  timestamp: Date
}

export interface AppNotification {
  id?: number
  title: string
  message: string
  type: 'task' | 'calendar' | 'habit' | 'emergency' | 'system'
  link?: string
  isRead: boolean
  priority: 'low' | 'medium' | 'high'
  timestamp: Date
}

// ─── Database Class ─────────────────────────────────────────────────────────

export class LifeMapDB extends Dexie {
  userSettings!: Table<UserSettings>
  savedPlaces!: Table<SavedPlace>
  notes!: Table<Note>
  tasks!: Table<Task>
  reminders!: Table<Reminder>
  habits!: Table<Habit>
  habitLogs!: Table<HabitLog>
  journalEntries!: Table<JournalEntry>
  contacts!: Table<Contact>
  expenses!: Table<Expense>
  calendarEvents!: Table<CalendarEvent>
  trips!: Table<Trip>
  emergencyProfile!: Table<EmergencyProfile>
  vaultItems!: Table<VaultItem>
  syncQueue!: Table<SyncQueueItem>
  mapRegions!: Table<MapRegion>
  peerMessages!: Table<PeerMessage>
  notifications!: Table<AppNotification>

  constructor() {
    super('LifeMapDB')
    this.version(1).stores({
      userSettings:    '++id',
      savedPlaces:     '++id, category, isFavorite, syncStatus, *tags',
      notes:           '++id, locationId, isPinned, isFavorite, isArchived, isDeleted, syncStatus, *tags',
      tasks:           '++id, priority, isCompleted, locationId, deadline, syncStatus',
      reminders:       '++id, datetime, isDismissed, locationId',
      habits:          '++id, frequency, syncStatus',
      habitLogs:       '++id, habitId, date',
      journalEntries:  '++id, date, mood, locationId, syncStatus',
      contacts:        '++id, category, isEmergencyContact, locationId, syncStatus',
      expenses:        '++id, category, date, locationId, tripId, syncStatus',
      calendarEvents:  '++id, start, end, type, locationId, syncStatus',
      trips:           '++id, status, syncStatus',
      emergencyProfile:'++id',
      vaultItems:      '++id, category',
      syncQueue:       '++id, entityType, status, timestamp',
      mapRegions:      '++id, status',
    })
    this.version(2).stores({
      peerMessages:    '++id, threadId, senderId, type, status, timestamp',
      notifications:   '++id, type, isRead, priority, timestamp',
    })
    this.version(3).stores({
      contacts:        '++id, name, category, isEmergencyContact, locationId, syncStatus',
      savedPlaces:     '++id, name, category, isFavorite, syncStatus, *tags',
      tasks:           '++id, priority, isCompleted, locationId, deadline, createdAt, syncStatus',
      habits:          '++id, frequency, createdAt, syncStatus',
    })
  }
}

export const db = new LifeMapDB()
