import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  AlertTriangle, Phone, MapPin, Heart, X,
  ChevronRight, Shield, Edit2, Save, Plus, Trash2
} from 'lucide-react'
import { db } from '@/db/schema'
import { useGeolocation } from '@/hooks'
import type { EmergencyProfile, EmergencyContact } from '@/db/schema'

function EmergencyContactCard({ contact, onCall }: { contact: EmergencyContact; onCall: () => void }) {
  return (
    <motion.div
      className="p-4 rounded-2xl flex items-center gap-4"
      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
      whileHover={{ scale: 1.02 }}>
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: 'rgba(239,68,68,0.2)' }}>
        {contact.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1">
        <p className="font-display font-bold" style={{ color: '#fca5a5' }}>{contact.name}</p>
        <p className="text-sm" style={{ color: 'rgba(252,165,165,0.7)' }}>{contact.relation}</p>
        <p className="text-sm font-mono mt-0.5" style={{ color: 'rgba(252,165,165,0.9)' }}>{contact.phone}</p>
      </div>
      <motion.a
        href={`tel:${contact.phone}`}
        onClick={onCall}
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: '#ef4444', boxShadow: '0 0 20px rgba(239,68,68,0.5)' }}
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
        animate={{ boxShadow: ['0 0 20px rgba(239,68,68,0.5)', '0 0 35px rgba(239,68,68,0.8)', '0 0 20px rgba(239,68,68,0.5)'] }}
        transition={{ repeat: Infinity, duration: 2 }}>
        <Phone size={20} color="white" />
      </motion.a>
    </motion.div>
  )
}

function EditProfileModal({ profile, onSave, onClose }: {
  profile?: EmergencyProfile
  onSave: (p: Partial<EmergencyProfile>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Partial<EmergencyProfile>>({
    bloodGroup: '', allergies: '', medications: '', medicalConditions: '',
    doctorName: '', doctorPhone: '', hospitalName: '', hospitalPhone: '',
    insuranceProvider: '', insurancePolicyNumber: '', organDonor: false,
    additionalNotes: '', emergencyContacts: [], ...profile
  })
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: '' })

  const addContact = () => {
    if (newContact.name && newContact.phone) {
      setForm(f => ({ ...f, emergencyContacts: [...(f.emergencyContacts || []), { ...newContact }] }))
      setNewContact({ name: '', phone: '', relation: '' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <motion.div className="glass-card w-full max-w-lg p-5 relative z-10 max-h-[90vh] overflow-y-auto space-y-3"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold" style={{ color: 'var(--color-text)' }}>Emergency Profile</h3>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--color-text-muted)' }} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Blood Group', field: 'bloodGroup', placeholder: 'e.g. O+' },
            { label: 'Organ Donor', field: 'organDonor', type: 'toggle' },
          ].map(({ label, field, placeholder, type }) => (
            <div key={field}>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
              {type === 'toggle' ? (
                <div className="flex items-center gap-2 mt-2 cursor-pointer"
                  onClick={() => setForm(f => ({ ...f, [field]: !f[field as keyof typeof f] }))}>
                  <div className="w-10 h-5 rounded-full transition-all"
                    style={{ background: form[field as keyof typeof form] ? '#10b981' : 'rgba(255,255,255,0.1)' }}>
                    <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${form[field as keyof typeof form] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {form.organDonor ? 'Yes' : 'No'}
                  </span>
                </div>
              ) : (
                <input className="input-field" placeholder={placeholder}
                  value={(form[field as keyof typeof form] as string) || ''}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
              )}
            </div>
          ))}
        </div>

        {[
          { label: 'Allergies', field: 'allergies' },
          { label: 'Current Medications', field: 'medications' },
          { label: 'Medical Conditions', field: 'medicalConditions' },
          { label: 'Doctor Name', field: 'doctorName' },
          { label: 'Doctor Phone', field: 'doctorPhone' },
          { label: 'Hospital Name', field: 'hospitalName' },
          { label: 'Hospital Phone', field: 'hospitalPhone' },
          { label: 'Insurance Provider', field: 'insuranceProvider' },
          { label: 'Policy Number', field: 'insurancePolicyNumber' },
          { label: 'Additional Notes', field: 'additionalNotes' },
        ].map(({ label, field }) => (
          <div key={field}>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
            <input className="input-field" placeholder={label}
              value={(form[field as keyof typeof form] as string) || ''}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
          </div>
        ))}

        {/* Emergency Contacts */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Emergency Contacts</p>
          {form.emergencyContacts?.map((c, i) => (
            <div key={i} className="flex items-center gap-2 mb-2 p-2 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.05)' }}>
              <div className="flex-1 text-sm" style={{ color: 'var(--color-text)' }}>{c.name} · {c.phone} · {c.relation}</div>
              <button onClick={() => setForm(f => ({ ...f, emergencyContacts: f.emergencyContacts?.filter((_, j) => j !== i) }))}
                style={{ color: '#ef4444' }}><Trash2 size={12} /></button>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2">
            {(['name', 'phone', 'relation'] as const).map(f => (
              <input key={f} className="input-field text-xs" placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                value={newContact[f]} onChange={e => setNewContact(c => ({ ...c, [f]: e.target.value }))} />
            ))}
          </div>
          <button onClick={addContact} className="btn-ghost w-full mt-2 text-xs flex items-center gap-1 justify-center">
            <Plus size={12} /> Add Contact
          </button>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => { onSave(form); onClose() }}
            className="btn-primary flex-1 flex items-center gap-2 justify-center">
            <Save size={14} /> Save Profile
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export function EmergencyPage() {
  const [showEdit, setShowEdit] = useState(false)
  const { coords, error: geoError } = useGeolocation()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const profile = useLiveQuery(() => db.emergencyProfile.toArray().then(p => p[0]), [])

  const saveProfile = async (data: Partial<EmergencyProfile>) => {
    if (profile?.id) {
      await db.emergencyProfile.update(profile.id, { ...data, updatedAt: new Date() })
    } else {
      await db.emergencyProfile.add({ ...data, updatedAt: new Date() } as EmergencyProfile)
    }
  }

  const medicalInfo = [
    { label: 'Blood Group', value: profile?.bloodGroup, icon: '🩸', critical: true },
    { label: 'Allergies', value: profile?.allergies, icon: '⚠️', critical: true },
    { label: 'Medications', value: profile?.medications, icon: '💊' },
    { label: 'Conditions', value: profile?.medicalConditions, icon: '🏥' },
    { label: 'Doctor', value: profile?.doctorName ? `${profile.doctorName} — ${profile.doctorPhone}` : null, icon: '👨‍⚕️' },
    { label: 'Hospital', value: profile?.hospitalName ? `${profile.hospitalName} — ${profile.hospitalPhone}` : null, icon: '🏨' },
    { label: 'Insurance', value: profile?.insuranceProvider ? `${profile.insuranceProvider} (${profile.insurancePolicyNumber})` : null, icon: '📋' },
    { label: 'Organ Donor', value: profile?.organDonor ? 'Yes ✓' : 'No', icon: '❤️' },
  ].filter(i => i.value)

  return (
    <div className="emergency-overlay p-6 pb-24 md:pb-6">
      {/* Header */}
      <motion.div className="text-center py-8"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <motion.div className="text-6xl mb-4"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}>🚨</motion.div>
        <h1 className="font-display font-black text-4xl mb-2" style={{ color: '#fca5a5' }}>EMERGENCY</h1>
        <p className="text-sm" style={{ color: 'rgba(252,165,165,0.6)' }}>
          Works offline • All data stored locally
        </p>
        <div className="mt-3 text-lg font-mono" style={{ color: 'rgba(252,165,165,0.7)' }}>
          {now.toLocaleTimeString()}
        </div>
      </motion.div>

      {/* GPS Location */}
      <motion.div className="rounded-2xl p-4 mb-6 text-center"
        style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <MapPin size={16} style={{ color: '#fca5a5' }} />
          <p className="text-sm font-semibold" style={{ color: '#fca5a5' }}>Your GPS Location</p>
        </div>
        {coords ? (
          <>
            <p className="text-lg font-mono font-bold" style={{ color: 'white' }}>
              {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
            </p>
            <a
              href={`https://maps.google.com/?q=${coords.latitude},${coords.longitude}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs underline mt-1 inline-block"
              style={{ color: 'rgba(252,165,165,0.7)' }}>
              Open in Google Maps ↗
            </a>
          </>
        ) : (
          <p className="text-sm" style={{ color: 'rgba(252,165,165,0.6)' }}>
            {geoError ? `⚠️ ${geoError}` : 'Getting location...'}
          </p>
        )}
      </motion.div>

      {/* Emergency Contacts */}
      {profile?.emergencyContacts && profile.emergencyContacts.length > 0 && (
        <motion.div className="mb-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'rgba(252,165,165,0.7)' }}>Emergency Contacts</h2>
          <div className="space-y-3">
            {profile.emergencyContacts.map((contact, i) => (
              <EmergencyContactCard key={i} contact={contact} onCall={() => {}} />
            ))}
          </div>
        </motion.div>
      )}

      {/* National Emergency Numbers */}
      <motion.div className="mb-6"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
        <h2 className="text-sm font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'rgba(252,165,165,0.7)' }}>National Emergency</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: 'Police', number: '100', icon: '👮' },
            { name: 'Ambulance', number: '108', icon: '🚑' },
            { name: 'Fire', number: '101', icon: '🔥' },
            { name: 'Women', number: '1091', icon: '👩' },
          ].map(({ name, number, icon }) => (
            <motion.a key={name} href={`tel:${number}`}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="font-bold text-sm" style={{ color: '#fca5a5' }}>{number}</p>
                <p className="text-xs" style={{ color: 'rgba(252,165,165,0.6)' }}>{name}</p>
              </div>
              <Phone size={14} className="ml-auto" style={{ color: 'rgba(252,165,165,0.6)' }} />
            </motion.a>
          ))}
        </div>
      </motion.div>

      {/* Medical Info */}
      {medicalInfo.length > 0 && (
        <motion.div className="mb-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'rgba(252,165,165,0.7)' }}>Medical Information</h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.25)' }}>
            {medicalInfo.map(({ label, value, icon, critical }, i) => (
              <div key={label} className="p-3 flex items-start gap-3"
                style={{
                  background: critical ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)',
                  borderBottom: i < medicalInfo.length - 1 ? '1px solid rgba(239,68,68,0.15)' : undefined
                }}>
                <span className="text-base">{icon}</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(252,165,165,0.6)' }}>
                    {label}
                  </p>
                  <p className={`text-sm mt-0.5 ${critical ? 'font-bold' : 'font-medium'}`}
                    style={{ color: critical ? '#fca5a5' : 'rgba(252,165,165,0.8)' }}>
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Additional Notes */}
      {profile?.additionalNotes && (
        <motion.div className="mb-6 p-4 rounded-2xl"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(252,165,165,0.6)' }}>
            Additional Notes
          </p>
          <p className="text-sm" style={{ color: 'rgba(252,165,165,0.8)' }}>{profile.additionalNotes}</p>
        </motion.div>
      )}

      {/* Edit Profile Button */}
      <motion.button
        className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold mb-4"
        style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
        onClick={() => setShowEdit(true)}
        whileHover={{ scale: 1.01 }}>
        <Edit2 size={16} /> Edit Emergency Profile
      </motion.button>

      {!profile && (
        <div className="text-center p-8" style={{ color: 'rgba(252,165,165,0.6)' }}>
          <Shield size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm mb-3">No emergency profile set up yet.</p>
          <button onClick={() => setShowEdit(true)}
            className="btn-danger mx-auto">
            Set Up Emergency Profile
          </button>
        </div>
      )}

      <AnimatePresence>
        {showEdit && (
          <EditProfileModal profile={profile} onSave={saveProfile} onClose={() => setShowEdit(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
