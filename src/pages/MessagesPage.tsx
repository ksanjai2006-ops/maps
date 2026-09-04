import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  MessageSquare, Radio, AlertTriangle, Send, MapPin,
  Users, CheckCheck, Shield, Sparkles, Wifi, ArrowUpRight,
  UserCheck, Smartphone
} from 'lucide-react'
import { MessagesDB } from '@/db/operations'
import { localP2P, type PeerInfo } from '@/services/localP2P'
import { useGeolocation } from '@/hooks'
import { useNavigate } from 'react-router-dom'

export function MessagesPage() {
  const navigate = useNavigate()
  const { coords } = useGeolocation()
  const [activeThread, setActiveThread] = useState<string>('broadcast')
  const [inputText, setInputText] = useState('')
  const [peers, setPeers] = useState<PeerInfo[]>([])
  const [myNickname, setMyNickname] = useState(localP2P.getPeerName())
  const [isEditingNick, setIsEditingNick] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Live query for active thread messages from Dexie
  const messages = useLiveQuery(
    () => MessagesDB.getByThread(activeThread),
    [activeThread]
  ) || []

  // Subscribe to P2P peer changes
  useEffect(() => {
    const unsub = localP2P.onPeersChange((list) => {
      setPeers(list)
    })
    return () => { unsub() }
  }, [])

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputText.trim()) return

    const text = inputText
    setInputText('')
    await localP2P.sendMessage(text, activeThread)
  }

  const handleSendLocation = async () => {
    if (!coords) return
    const text = `📍 My current GPS location: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
    await localP2P.sendMessage(text, activeThread, {
      lat: coords.latitude,
      lng: coords.longitude
    })
  }

  const handleBroadcastSOS = async () => {
    const text = coords
      ? `🚨 EMERGENCY SOS: Immediate assistance required at ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
      : `🚨 EMERGENCY SOS: Immediate assistance required! Location unavailable.`

    await localP2P.broadcastSOS(text, coords ? { lat: coords.latitude, lng: coords.longitude } : undefined)
    setActiveThread('sos')
  }

  const handleSaveNickname = () => {
    if (myNickname.trim()) {
      localP2P.setPeerName(myNickname.trim())
    }
    setIsEditingNick(false)
  }

  return (
    <div className="h-[calc(100dvh-60px)] md:h-[100dvh] flex flex-col md:flex-row overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* ── Sidebar: Channels & Peers ── */}
      <div className="w-full md:w-80 border-r border-[rgba(124,58,237,0.15)] flex flex-col bg-white/[0.01]">
        {/* Header */}
        <div className="p-4 border-b border-[rgba(124,58,237,0.15)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-accent-violet/20 text-accent-violet">
                <Radio size={16} />
              </div>
              <div>
                <h1 className="font-display font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                  Local Mesh
                </h1>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Zero Internet LAN
                </span>
              </div>
            </div>

            {/* Quick SOS Beacon */}
            <button
              onClick={handleBroadcastSOS}
              className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-bold flex items-center gap-1 border border-red-500/30 cursor-pointer"
              title="Broadcast Emergency Distress Beacon"
            >
              <AlertTriangle size={12} /> SOS
            </button>
          </div>

          {/* Nickname pill */}
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Smartphone size={13} className="text-accent-cyan" />
              <span style={{ color: 'var(--color-text-muted)' }}>Device:</span>
              {isEditingNick ? (
                <input
                  type="text"
                  value={myNickname}
                  onChange={(e) => setMyNickname(e.target.value)}
                  onBlur={handleSaveNickname}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveNickname()}
                  autoFocus
                  className="bg-black/40 px-1 py-0.5 rounded text-xs text-accent-cyan outline-none border border-accent-cyan"
                />
              ) : (
                <span
                  onClick={() => setIsEditingNick(true)}
                  className="font-bold text-accent-cyan cursor-pointer hover:underline"
                  title="Click to edit nickname"
                >
                  {myNickname}
                </span>
              )}
            </div>
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              ID: {localP2P.getPeerId().slice(-4)}
            </span>
          </div>
        </div>

        {/* Channels List */}
        <div className="p-3 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-1" style={{ color: 'var(--color-text-muted)' }}>
            Channels
          </div>

          <button
            onClick={() => setActiveThread('broadcast')}
            className={`w-full p-2.5 rounded-xl text-left text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
              activeThread === 'broadcast'
                ? 'bg-accent-violet text-white shadow-md'
                : 'hover:bg-white/5 text-[var(--color-text)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={15} />
              <span>Public Mesh Broadcast</span>
            </div>
            <span className="text-[10px] opacity-75">All peers</span>
          </button>

          <button
            onClick={() => setActiveThread('sos')}
            className={`w-full p-2.5 rounded-xl text-left text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
              activeThread === 'sos'
                ? 'bg-red-600 text-white shadow-md'
                : 'hover:bg-white/5 text-red-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>🚨 Emergency SOS Channel</span>
            </div>
            <span className="text-[10px] font-bold uppercase">Priority</span>
          </button>
        </div>

        {/* Discovered Peers */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 border-t border-[rgba(124,58,237,0.1)]">
          <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 flex items-center justify-between" style={{ color: 'var(--color-text-muted)' }}>
            <span>Nearby Devices ({peers.length})</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
            </span>
          </div>

          {peers.length === 0 ? (
            <div className="p-3 text-center text-[11px] rounded-xl bg-white/[0.02] border border-white/5" style={{ color: 'var(--color-text-muted)' }}>
              Scanning local Wi-Fi / mesh... Open LifeMap in another tab or device to connect!
            </div>
          ) : (
            peers.map((peer) => (
              <div
                key={peer.peerId}
                className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                    {peer.name}
                  </span>
                </div>
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  Online
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Main Chat Stream ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Thread Header */}
        <div className="p-4 border-b border-[rgba(124,58,237,0.15)] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeThread === 'sos' ? 'bg-red-500/20 text-red-400' : 'bg-accent-cyan/20 text-accent-cyan'}`}>
              {activeThread === 'sos' ? <AlertTriangle size={16} /> : <MessageSquare size={16} />}
            </div>
            <div>
              <div className="font-display font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                {activeThread === 'sos' ? 'Emergency Distress Beacon Channel' : 'Public Mesh Broadcast'}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                Messages persist locally in IndexedDB and synchronize via BroadcastChannel
              </div>
            </div>
          </div>

          {coords && (
            <button
              onClick={handleSendLocation}
              className="btn-ghost text-xs py-1 px-2.5 flex items-center gap-1 text-accent-cyan"
              title="Broadcast GPS coordinates"
            >
              <MapPin size={13} /> Share Location
            </button>
          )}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => {
            const isMe = msg.senderId === localP2P.getPeerId()
            const isSOS = msg.type === 'sos' || msg.threadId === 'sos'
            const isSystem = msg.type === 'system'

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center my-3">
                  <span className="px-3 py-1 rounded-full text-[11px] bg-white/[0.04] border border-white/10" style={{ color: 'var(--color-text-muted)' }}>
                    ℹ️ {msg.content}
                  </span>
                </div>
              )
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="text-[10px] mb-1 px-1 font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  {isMe ? 'You' : msg.senderName}
                </div>

                <div
                  className={`p-3 rounded-2xl max-w-[80%] text-xs leading-relaxed ${
                    isSOS
                      ? 'bg-red-600/90 text-white border border-red-400/50 shadow-lg shadow-red-500/20'
                      : isMe
                      ? 'bg-gradient-to-r from-accent-violet to-accent-violet/90 text-white rounded-br-xs'
                      : 'bg-white/[0.06] border border-white/10 rounded-bl-xs'
                  }`}
                  style={{ color: isMe || isSOS ? '#fff' : 'var(--color-text)' }}
                >
                  <div>{msg.content}</div>

                  {/* Location card if attached */}
                  {msg.location && (
                    <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between">
                      <span className="text-[10px]">
                        📍 {msg.location.lat.toFixed(4)}, {msg.location.lng.toFixed(4)}
                      </span>
                      <button
                        onClick={() => navigate('/map')}
                        className="text-[10px] underline font-bold flex items-center gap-0.5"
                      >
                        Map <ArrowUpRight size={10} />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 mt-1 text-[9px] opacity-70">
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && <CheckCheck size={11} />}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Bar */}
        <div className="p-3 border-t border-[rgba(124,58,237,0.15)] bg-white/[0.02]">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendLocation}
              className="p-2.5 rounded-xl hover:bg-white/10 text-accent-cyan"
              title="Share GPS Coordinates"
            >
              <MapPin size={16} />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${activeThread === 'sos' ? 'SOS Channel...' : 'Local Mesh...'}`}
              className="input-field flex-1 text-xs py-2"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="btn-primary p-2.5 rounded-xl disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
