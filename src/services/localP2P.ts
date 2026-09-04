import { MessagesDB, NotificationsDB } from '@/db/operations'
import type { PeerMessage } from '@/db/schema'

export interface PeerInfo {
  peerId: string
  name: string
  lastSeen: Date
  isOnline: boolean
}

type MessageListener = (msg: PeerMessage) => void
type PeerListener = (peers: PeerInfo[]) => void
type SOSListener = (sos: { senderName: string; location?: { lat: number; lng: number }; content: string }) => void

class LocalP2PManager {
  private channel: BroadcastChannel | null = null
  private myPeerId: string
  private myPeerName: string
  private peers: Map<string, PeerInfo> = new Map()
  private messageListeners: Set<MessageListener> = new Set()
  private peerListeners: Set<PeerListener> = new Set()
  private sosListeners: Set<SOSListener> = new Set()
  private heartbeatTimer: any = null

  constructor() {
    this.myPeerId = this.getOrCreatePeerId()
    this.myPeerName = localStorage.getItem('lifemap_peer_name') || `User-${this.myPeerId.slice(-4).toUpperCase()}`
    this.initChannel()
  }

  private getOrCreatePeerId(): string {
    let id = localStorage.getItem('lifemap_peer_id')
    if (!id) {
      id = 'peer_' + Math.random().toString(36).substring(2, 9)
      localStorage.setItem('lifemap_peer_id', id)
    }
    return id
  }

  setPeerName(name: string) {
    this.myPeerName = name
    localStorage.setItem('lifemap_peer_name', name)
    this.broadcastHeartbeat()
  }

  getPeerId() { return this.myPeerId }
  getPeerName() { return this.myPeerName }

  private initChannel() {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return

    this.channel = new BroadcastChannel('lifemap-local-mesh')
    this.channel.onmessage = (event) => {
      this.handleIncoming(event.data)
    }

    // Start heartbeat
    this.broadcastHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      this.broadcastHeartbeat()
      this.cleanStalePeers()
    }, 5000)

    window.addEventListener('beforeunload', () => {
      this.channel?.postMessage({
        type: 'GOODBYE',
        peerId: this.myPeerId
      })
    })
  }

  private broadcastHeartbeat() {
    this.channel?.postMessage({
      type: 'HEARTBEAT',
      peerId: this.myPeerId,
      name: this.myPeerName,
      timestamp: new Date().toISOString()
    })
  }

  private cleanStalePeers() {
    const now = Date.now()
    let changed = false
    this.peers.forEach((peer, id) => {
      if (now - peer.lastSeen.getTime() > 15000) {
        this.peers.delete(id)
        changed = true
      }
    })
    if (changed) {
      this.notifyPeerListeners()
    }
  }

  private handleIncoming(data: any) {
    if (!data || data.peerId === this.myPeerId) return

    switch (data.type) {
      case 'HEARTBEAT':
        this.peers.set(data.peerId, {
          peerId: data.peerId,
          name: data.name || 'Nearby Device',
          lastSeen: new Date(),
          isOnline: true
        })
        this.notifyPeerListeners()
        break

      case 'GOODBYE':
        this.peers.delete(data.peerId)
        this.notifyPeerListeners()
        break

      case 'CHAT_MESSAGE':
        const incomingMsg: PeerMessage = {
          threadId: data.threadId || 'broadcast',
          senderId: data.senderId,
          senderName: data.senderName,
          recipientId: data.recipientId,
          content: data.content,
          type: data.msgType || 'text',
          location: data.location,
          status: 'delivered',
          timestamp: new Date(data.timestamp || Date.now())
        }

        // Save to local IndexedDB
        MessagesDB.add(incomingMsg).then((id) => {
          const withId = { ...incomingMsg, id }
          this.messageListeners.forEach((fn) => fn(withId))
        })
        break

      case 'SOS_BEACON':
        const sosMsg: PeerMessage = {
          threadId: 'sos',
          senderId: data.senderId,
          senderName: data.senderName,
          content: data.content || '🚨 EMERGENCY SOS ALERT: User needs immediate assistance!',
          type: 'sos',
          location: data.location,
          status: 'delivered',
          timestamp: new Date(data.timestamp || Date.now())
        }

        MessagesDB.add(sosMsg).then((id) => {
          const withId = { ...sosMsg, id }
          this.messageListeners.forEach((fn) => fn(withId))
        })

        // Also add to system notifications
        NotificationsDB.add({
          title: `🚨 EMERGENCY from ${data.senderName}`,
          message: data.content || 'SOS distress signal received on local network',
          type: 'emergency',
          link: '/messages',
          isRead: false,
          priority: 'high',
          timestamp: new Date()
        })

        this.sosListeners.forEach((fn) =>
          fn({ senderName: data.senderName, location: data.location, content: data.content })
        )
        break
    }
  }

  async sendMessage(content: string, threadId: string = 'broadcast', location?: { lat: number; lng: number }): Promise<PeerMessage> {
    const msg: PeerMessage = {
      threadId,
      senderId: this.myPeerId,
      senderName: this.myPeerName,
      content,
      type: location ? 'location' : 'text',
      location,
      status: 'delivered',
      timestamp: new Date()
    }

    const id = await MessagesDB.add(msg)
    const savedMsg = { ...msg, id }

    this.channel?.postMessage({
      type: 'CHAT_MESSAGE',
      threadId,
      senderId: this.myPeerId,
      senderName: this.myPeerName,
      content,
      msgType: msg.type,
      location,
      timestamp: msg.timestamp.toISOString()
    })

    this.messageListeners.forEach((fn) => fn(savedMsg))
    return savedMsg
  }

  async broadcastSOS(content: string = '🚨 SOS Alert: I need assistance immediately!', location?: { lat: number; lng: number }): Promise<PeerMessage> {
    const msg: PeerMessage = {
      threadId: 'sos',
      senderId: this.myPeerId,
      senderName: this.myPeerName,
      content,
      type: 'sos',
      location,
      status: 'delivered',
      timestamp: new Date()
    }

    const id = await MessagesDB.add(msg)
    const savedMsg = { ...msg, id }

    this.channel?.postMessage({
      type: 'SOS_BEACON',
      senderId: this.myPeerId,
      senderName: this.myPeerName,
      content,
      location,
      timestamp: msg.timestamp.toISOString()
    })

    this.messageListeners.forEach((fn) => fn(savedMsg))
    return savedMsg
  }

  onMessage(fn: MessageListener) {
    this.messageListeners.add(fn)
    return () => this.messageListeners.delete(fn)
  }

  onPeersChange(fn: PeerListener) {
    this.peerListeners.add(fn)
    fn(this.getPeers())
    return () => this.peerListeners.delete(fn)
  }

  onSOS(fn: SOSListener) {
    this.sosListeners.add(fn)
    return () => this.sosListeners.delete(fn)
  }

  private notifyPeerListeners() {
    const list = this.getPeers()
    this.peerListeners.forEach((fn) => fn(list))
  }

  getPeers(): PeerInfo[] {
    return Array.from(this.peers.values())
  }
}

export const localP2P = new LocalP2PManager()
