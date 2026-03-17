import {
  doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  collection, query, where, getDocs, orderBy, limit,
  serverTimestamp, increment, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type StepKey = 'google' | 'instagram' | 'tiktok' | 'facebook'

export type Prize = {
  id:    string   // nanoid
  label: string
  color: string
  prob:  number   // 0-100, sum must = 100
}

export type Venue = {
  id?:           string
  slug:          string
  venueName:     string
  ownerUid:      string
  ownerEmail:    string
  // Social links
  googleUrl:     string
  instagramUrl:  string
  tiktokUrl:     string
  facebookUrl:   string
  // Which steps are active (ordered)
  steps:         StepKey[]
  // Wheel prizes
  prizes:        Prize[]
  // Stats
  scanCount:     number
  spinCount:     number
  // Settings
  primaryColor:  string   // brand color for client page
  logoEmoji:     string
  createdAt?:    Timestamp
}

export type Client = {
  id?:        string
  phone:      string          // normalized: +33612345678
  email:      string
  prize:      string
  prizeColor: string
  voucherCode:string
  venueId:    string
  createdAt:  string
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

export function genCode(): string {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)]
  return s.slice(0, 4) + '-' + s.slice(4)
}

export function slugify(str: string): string {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('33')) return '+' + digits
  if (digits.startsWith('0') && digits.length === 10) return '+33' + digits.slice(1)
  return '+' + digits
}

// ─── VENUES ──────────────────────────────────────────────────────────────────

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  const q = query(collection(db, 'venues'), where('slug', '==', slug), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Venue
}

export async function getVenueByOwner(uid: string): Promise<Venue | null> {
  const q = query(collection(db, 'venues'), where('ownerUid', '==', uid), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Venue
}

const DEFAULT_PRIZES: Prize[] = [
  { id: '1', label: 'Verre offert 🍺',    color: '#F5C518', prob: 20 },
  { id: '2', label: '-20% addition',      color: '#FF6B35', prob: 25 },
  { id: '3', label: 'Shot offert 🥃',     color: '#4ECDC4', prob: 15 },
  { id: '4', label: 'Dessert offert 🍰',  color: '#A8E6CF', prob: 10 },
  { id: '5', label: 'Café offert ☕',     color: '#9B59B6', prob: 20 },
  { id: '6', label: 'Tente ta chance 😅', color: '#222222', prob: 10 },
]

export async function createVenue(data: {
  slug: string; venueName: string; ownerUid: string; ownerEmail: string
}): Promise<string> {
  const venue: Omit<Venue, 'id'> = {
    ...data,
    googleUrl:    '',
    instagramUrl: '',
    tiktokUrl:    '',
    facebookUrl:  '',
    steps:        ['google'],
    prizes:       DEFAULT_PRIZES,
    scanCount:    0,
    spinCount:    0,
    primaryColor: '#F5C518',
    logoEmoji:    '⭐',
  }
  const ref = await addDoc(collection(db, 'venues'), {
    ...venue,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateVenue(id: string, data: Partial<Venue>) {
  await updateDoc(doc(db, 'venues', id), data as Record<string, unknown>)
}

export async function incrementScan(venueId: string) {
  await updateDoc(doc(db, 'venues', venueId), { scanCount: increment(1) })
}

// ─── CLIENTS (anti-abuse + DB) ────────────────────────────────────────────────

export async function phoneAlreadyUsed(venueId: string, phone: string): Promise<boolean> {
  const q = query(
    collection(db, 'venues', venueId, 'clients'),
    where('phone', '==', phone),
    limit(1)
  )
  const snap = await getDocs(q)
  return !snap.empty
}

export async function saveClient(venueId: string, data: Omit<Client, 'id'>): Promise<string> {
  await updateDoc(doc(db, 'venues', venueId), { spinCount: increment(1) })
  const ref = await addDoc(collection(db, 'venues', venueId, 'clients'), data)
  return ref.id
}

export async function getClients(venueId: string, max = 200): Promise<Client[]> {
  const q = query(
    collection(db, 'venues', venueId, 'clients'),
    orderBy('createdAt', 'desc'),
    limit(max)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Client))
}
