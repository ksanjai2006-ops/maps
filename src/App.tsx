import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './pages/Dashboard'
import { MapPage } from './pages/MapPage'
import { NotesPage } from './pages/NotesPage'
import { TasksPage } from './pages/TasksPage'
import { ContactsPage } from './pages/ContactsPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { CalendarPage } from './pages/CalendarPage'
import { EmergencyPage } from './pages/EmergencyPage'
import { VaultPage } from './pages/VaultPage'
import { SearchPage } from './pages/SearchPage'
import { SettingsPage } from './pages/SettingsPage'
import { PlacesPage } from './pages/PlacesPage'
import { OfflineMapsPage } from './pages/OfflineMapsPage'
import { MessagesPage } from './pages/MessagesPage'
import { AssistantPage } from './pages/AssistantPage'
import { useTheme } from './hooks'
import { useOnlineStatus } from './hooks'

export default function App() {
  useTheme()
  useOnlineStatus()

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="map" element={<MapPage />} />
          <Route path="offline-maps" element={<OfflineMapsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="places" element={<PlacesPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="emergency" element={<EmergencyPage />} />
          <Route path="vault" element={<VaultPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
