'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getVenueByOwner, updateVenue, getClients, type Venue, type Prize, type StepKey, type Client } from '@/lib/firestore'
import QRCode from 'react-qr-code'

type Tab = 'dashboard' | 'settings' | 'prizes' | 'steps' | 'clients' | 'qr'
const STEP_META: Record<StepKey, { icon: string; label: string; field: keyof Venue }> = {
  google:    { icon: '⭐', label: 'Avis Google',       field: 'googleUrl' },
  instagram: { icon: '📸', label: 'Follow Instagram',  field: 'instagramUrl' },
  tiktok:    { icon: '🎵', label: 'Follow TikTok',     field: 'tiktokUrl' },
  facebook:  { icon: '👍', label: 'Follow Facebook',   field: 'facebookUrl' },
}
const ALL_STEPS: StepKey[] = ['google','instagram','tiktok','facebook']

function uid4() { return Math.random().toString(36).slice(2,6) }

export default function Dashboard() {
  const router = useRouter()
  const [venue, setVenue]   = useState<Venue | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [tab, setTab]       = useState<Tab>('dashboard')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [authOk, setAuthOk] = useState(false)

  // form state
  const [venueName, setVenueName]     = useState('')
  const [googleUrl, setGoogleUrl]     = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [tiktokUrl, setTiktokUrl]     = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#F5C518')
  const [logoEmoji, setLogoEmoji]     = useState('⭐')
  const [prizes, setPrizes]           = useState<Prize[]>([])
  const [steps, setSteps]             = useState<StepKey[]>([])

  // Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) { router.push('/login'); return }
      setAuthOk(true)
      getVenueByOwner(user.uid).then(v => {
        if (!v) return
        setVenue(v)
        setVenueName(v.venueName)
        setGoogleUrl(v.googleUrl)
        setInstagramUrl(v.instagramUrl)
        setTiktokUrl(v.tiktokUrl)
        setFacebookUrl(v.facebookUrl)
        setPrimaryColor(v.primaryColor || '#F5C518')
        setLogoEmoji(v.logoEmoji || '⭐')
        setPrizes(v.prizes)
        setSteps(v.steps)
        getClients(v.id!).then(setClients)
      })
    })
    return () => unsub()
  }, [router])

  async function save() {
    if (!venue?.id) return
    setSaving(true)
    const data: Partial<Venue> = { venueName, googleUrl, instagramUrl, tiktokUrl, facebookUrl, primaryColor, logoEmoji, prizes, steps }
    await updateVenue(venue.id, data)
    setVenue(prev => prev ? { ...prev, ...data } : prev)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Prizes helpers
  function addPrize() {
    setPrizes(prev => [...prev, { id: uid4(), label: 'Nouveau lot 🎁', color: '#888888', prob: 10 }])
  }
  function updatePrize(id: string, key: keyof Prize, val: string | number) {
    setPrizes(prev => prev.map(p => p.id === id ? { ...p, [key]: val } : p))
  }
  function removePrize(id: string) {
    setPrizes(prev => prev.filter(p => p.id !== id))
  }

  // Steps helpers
  function toggleStep(s: StepKey) {
    setSteps(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  function moveStep(s: StepKey, dir: -1|1) {
    setSteps(prev => {
      const i = prev.indexOf(s); if (i < 0) return prev
      const next = [...prev]; const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]; return next
    })
  }

  const totalProb = prizes.reduce((s,p) => s + Number(p.prob), 0)
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const clientUrl = venue?.slug ? `${appUrl}/${venue.slug}` : ''

  // Stats
  const scans  = venue?.scanCount || 0
  const spins  = venue?.spinCount || 0
  const conv   = scans > 0 ? Math.round(spins/scans*100) : 0
  const prizeMap: Record<string,number> = {}
  clients.forEach(c => { prizeMap[c.prize] = (prizeMap[c.prize]||0)+1 })

  if (!authOk || !venue) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[#1c1c1c] border-t-gold rounded-full animate-spin"/>
    </div>
  )

  const navItems: { id: Tab; icon: string; label: string }[] = [
    { id:'dashboard', icon:'📊', label:'Dashboard' },
    { id:'clients',   icon:'👥', label:'Clients' },
    { id:'settings',  icon:'⚙️', label:'Paramètres' },
    { id:'steps',     icon:'🔗', label:'Étapes' },
    { id:'prizes',    icon:'🎁', label:'Lots & Roue' },
    { id:'qr',        icon:'📱', label:'QR Code' },
  ]

  return (
    <div className="flex min-h-screen">
      {/* ── SIDEBAR ── */}
      <aside className="w-[210px] flex-shrink-0 bg-[#0d0d0d] border-r border-[#1a1a1a] flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="px-5 py-6 border-b border-[#1a1a1a] mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-[10px] text-[#080808] mb-3"
            style={{ background: primaryColor }}>{logoEmoji}</div>
          <p className="font-display font-black text-sm leading-tight">{venueName}</p>
          <p className="text-[10px] text-[#555] mt-0.5 truncate">/{venue.slug}</p>
        </div>
        <nav className="flex-1 px-2">
          {navItems.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-all border ${
                tab===n.id ? 'text-gold bg-gold/8 border-gold/15' : 'text-[#777] border-transparent hover:text-white hover:bg-white/4'}`}>
              <span className="w-5 text-base">{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[#1a1a1a] space-y-2">
          <a href={clientUrl} target="_blank" rel="noreferrer"
            className="block w-full text-center text-[#080808] font-bold text-xs py-2.5 rounded-xl transition-opacity hover:opacity-80"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, #FF6B35)` }}>
            ▶ Page client
          </a>
          <button onClick={() => signOut(auth).then(() => router.push('/login'))}
            className="w-full text-[#555] text-xs hover:text-white transition-colors py-1">
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="ml-[210px] flex-1 p-8 relative z-10 min-h-screen">

        {/* ════ DASHBOARD ════ */}
        {tab === 'dashboard' && (
          <div className="animate-fadeUp">
            <h1 className="font-display font-black text-2xl mb-7">Dashboard <span className="text-gold">📊</span></h1>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
              {[
                { label:'Scans QR',      val:scans,    icon:'🔍', color:'text-gold',       bar:'bg-gold' },
                { label:'Tours de roue', val:spins,    icon:'🎰', color:'text-orange-400', bar:'bg-orange-400' },
                { label:'Taux conv.',    val:conv+'%', icon:'📈', color:'text-green-400',  bar:'bg-green-400' },
                { label:'Clients DB',    val:clients.length, icon:'👥', color:'text-blue-400', bar:'bg-blue-400' },
              ].map(({ label,val,icon,color,bar }) => (
                <div key={label} className="bg-[#111] border border-[#1c1c1c] rounded-2xl p-5 overflow-hidden relative">
                  <div className={`absolute top-0 left-0 right-0 h-0.5 ${bar}`}/>
                  <span className="text-2xl block mb-3">{icon}</span>
                  <div className={`font-display font-black text-4xl leading-none mb-1 ${color}`}>{val}</div>
                  <div className="text-xs text-[#777] uppercase tracking-wider font-semibold">{label}</div>
                </div>
              ))}
            </div>
            {/* Lots distribués */}
            <div className="bg-[#111] border border-[#1c1c1c] rounded-2xl p-6">
              <h2 className="font-display font-bold text-xs uppercase tracking-widest text-[#777] mb-5 flex items-center gap-2">
                <span className="w-1 h-4 bg-gold rounded"/>Lots distribués
              </h2>
              {Object.keys(prizeMap).length === 0
                ? <p className="text-[#555] text-sm text-center py-8">Aucune partie jouée pour l&apos;instant 🎲</p>
                : <table className="w-full">
                    <thead><tr className="text-[10px] text-[#555] uppercase tracking-widest border-b border-[#1c1c1c]">
                      <th className="text-left py-2 px-3">Lot</th><th className="text-left py-2 px-3">Gagnés</th><th className="text-left py-2 px-3">%</th>
                    </tr></thead>
                    <tbody>
                      {Object.entries(prizeMap).sort((a,b)=>b[1]-a[1]).map(([prize,count]) => {
                        const p = prizes.find(x=>x.label===prize)
                        const tot = Object.values(prizeMap).reduce((s,v)=>s+v,0)
                        return (
                          <tr key={prize} className="border-b border-white/[0.03] text-sm">
                            <td className="py-3 px-3 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:p?.color||'#888'}}/>
                              {prize}
                            </td>
                            <td className="py-3 px-3 font-bold">{count}</td>
                            <td className="py-3 px-3 text-[#777]">{Math.round(count/tot*100)}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
              }
            </div>
          </div>
        )}

        {/* ════ CLIENTS DB ════ */}
        {tab === 'clients' && (
          <div className="animate-fadeUp">
            <div className="flex items-center justify-between mb-7">
              <h1 className="font-display font-black text-2xl">Clients <span className="text-gold">👥</span></h1>
              <span className="text-sm text-[#777]">{clients.length} client{clients.length>1?'s':''}</span>
            </div>
            <div className="bg-[#111] border border-[#1c1c1c] rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="text-[10px] text-[#555] uppercase tracking-widest border-b border-[#1c1c1c] bg-[#0d0d0d]">
                  <th className="text-left py-3 px-4">Téléphone</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Lot gagné</th>
                  <th className="text-left py-3 px-4">Code</th>
                  <th className="text-left py-3 px-4">Date</th>
                </tr></thead>
                <tbody>
                  {clients.length === 0
                    ? <tr><td colSpan={5} className="text-center text-[#555] text-sm py-12">Aucun client pour l&apos;instant</td></tr>
                    : clients.map(c => (
                        <tr key={c.id} className="border-b border-white/[0.03] text-sm hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-mono text-xs text-[#888]">{c.phone}</td>
                          <td className="py-3 px-4 text-[#888] text-xs">{c.email}</td>
                          <td className="py-3 px-4">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{background:c.prizeColor}}/>
                              {c.prize}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-display font-bold text-xs text-[#777] tracking-widest">{c.voucherCode}</td>
                          <td className="py-3 px-4 text-xs text-[#555]">
                            {new Date(c.createdAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}
                            {' '}
                            {new Date(c.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════ SETTINGS ════ */}
        {tab === 'settings' && (
          <div className="animate-fadeUp max-w-lg">
            <div className="flex items-center justify-between mb-7">
              <h1 className="font-display font-black text-2xl">Paramètres <span className="text-gold">⚙️</span></h1>
              <button onClick={save} disabled={saving} className="btn-gold px-5 py-2.5 text-sm flex items-center gap-2">
                {saved ? '✓ Sauvegardé' : saving ? '...' : '💾 Sauvegarder'}
              </button>
            </div>
            <div className="bg-[#111] border border-[#1c1c1c] rounded-2xl p-6 space-y-5">
              {[
                { label:"Nom de l'établissement", val:venueName, set:setVenueName, ph:'Mon Bar' },
                { label:"Lien Google My Business", val:googleUrl, set:setGoogleUrl, ph:'https://search.google.com/local/writereview?placeid=...' },
                { label:"Lien Instagram", val:instagramUrl, set:setInstagramUrl, ph:'https://instagram.com/monbar' },
                { label:"Lien TikTok", val:tiktokUrl, set:setTiktokUrl, ph:'https://tiktok.com/@monbar' },
                { label:"Lien Facebook", val:facebookUrl, set:setFacebookUrl, ph:'https://facebook.com/monbar' },
              ].map(({ label,val,set,ph }) => (
                <div key={label}>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-[#777] mb-2">{label}</label>
                  <input value={val} onChange={e => set(e.target.value)} placeholder={ph} className="input"/>
                </div>
              ))}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold uppercase tracking-widest text-[#777] mb-2">Couleur principale</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                      className="w-12 h-10 rounded-xl border-2 border-[#252525] cursor-pointer bg-transparent"/>
                    <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="input flex-1"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-[#777] mb-2">Emoji logo</label>
                  <input value={logoEmoji} onChange={e => setLogoEmoji(e.target.value)} className="input w-20 text-center text-2xl"/>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ STEPS ════ */}
        {tab === 'steps' && (
          <div className="animate-fadeUp max-w-lg">
            <div className="flex items-center justify-between mb-7">
              <h1 className="font-display font-black text-2xl">Étapes client <span className="text-gold">🔗</span></h1>
              <button onClick={save} disabled={saving} className="btn-gold px-5 py-2.5 text-sm">
                {saved ? '✓ Sauvegardé' : saving ? '...' : '💾 Sauvegarder'}
              </button>
            </div>
            <div className="bg-[#111] border border-[#1c1c1c] rounded-2xl p-6 mb-5">
              <p className="text-sm text-[#777] mb-5 leading-relaxed">
                Choisis les actions que tes clients devront effectuer avant de tourner la roue. Réorganise l&apos;ordre avec les flèches.
              </p>
              {/* Active steps (ordered) */}
              <div className="space-y-2 mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#555] mb-3">Étapes activées (dans l&apos;ordre)</p>
                {steps.length === 0 && <p className="text-xs text-[#555] py-4 text-center">Aucune étape activée</p>}
                {steps.map((s,i) => {
                  const m = STEP_META[s]
                  return (
                    <div key={s} className="flex items-center gap-3 bg-gold/5 border border-gold/20 rounded-xl px-4 py-3">
                      <span className="text-xl">{m.icon}</span>
                      <span className="flex-1 text-sm font-semibold">{m.label}</span>
                      <div className="flex gap-1">
                        <button onClick={() => moveStep(s,-1)} disabled={i===0}
                          className="w-7 h-7 bg-[#1c1c1c] rounded-lg text-xs text-[#777] hover:text-white disabled:opacity-30 transition-colors">↑</button>
                        <button onClick={() => moveStep(s,1)} disabled={i===steps.length-1}
                          className="w-7 h-7 bg-[#1c1c1c] rounded-lg text-xs text-[#777] hover:text-white disabled:opacity-30 transition-colors">↓</button>
                        <button onClick={() => toggleStep(s)}
                          className="w-7 h-7 bg-[#1c1c1c] rounded-lg text-xs text-red-500 hover:bg-red-500/10 transition-colors">×</button>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Available to add */}
              <p className="text-xs font-semibold uppercase tracking-widest text-[#555] mb-3">Disponibles</p>
              <div className="space-y-2">
                {ALL_STEPS.filter(s => !steps.includes(s)).map(s => {
                  const m = STEP_META[s]
                  return (
                    <button key={s} onClick={() => toggleStep(s)}
                      className="w-full flex items-center gap-3 border border-dashed border-[#252525] rounded-xl px-4 py-3 hover:border-gold hover:text-gold text-[#777] transition-all">
                      <span className="text-xl">{m.icon}</span>
                      <span className="flex-1 text-sm text-left">{m.label}</span>
                      <span className="text-xs">+ Ajouter</span>
                    </button>
                  )
                })}
              </div>
            </div>
            {/* Links reminder */}
            {steps.some(s => !['google'].includes(s)) && (
              <div className="bg-orange-400/5 border border-orange-400/20 rounded-2xl p-4 text-sm text-orange-300">
                ⚠️ Pense à renseigner les liens correspondants dans &quot;Paramètres&quot;
              </div>
            )}
          </div>
        )}

        {/* ════ PRIZES ════ */}
        {tab === 'prizes' && (
          <div className="animate-fadeUp max-w-2xl">
            <div className="flex items-center justify-between mb-7">
              <h1 className="font-display font-black text-2xl">Lots & Roue <span className="text-gold">🎁</span></h1>
              <button onClick={save} disabled={saving} className="btn-gold px-5 py-2.5 text-sm">
                {saved ? '✓ Sauvegardé' : saving ? '...' : '💾 Sauvegarder'}
              </button>
            </div>
            <div className="bg-[#111] border border-[#1c1c1c] rounded-2xl p-6">
              <p className="text-sm text-[#777] mb-5">Configure les lots et leur probabilité. Le total doit faire exactement 100%.</p>
              {/* Header */}
              <div className="grid grid-cols-[36px_1fr_80px_36px] gap-2 mb-2 px-1 text-[10px] text-[#555] uppercase tracking-widest">
                <span/>
                <span>Nom du lot</span>
                <span className="text-center">Prob %</span>
                <span/>
              </div>
              {/* Rows */}
              <div className="space-y-2 mb-3">
                {prizes.map(p => (
                  <div key={p.id} className="grid grid-cols-[36px_1fr_80px_36px] gap-2 items-center">
                    <input type="color" value={p.color} onChange={e => updatePrize(p.id,'color',e.target.value)}
                      className="w-9 h-9 rounded-xl border-2 border-[#252525] cursor-pointer bg-transparent flex-shrink-0"/>
                    <input value={p.label} onChange={e => updatePrize(p.id,'label',e.target.value)}
                      className="input py-2 text-sm"/>
                    <input type="number" value={p.prob} onChange={e => updatePrize(p.id,'prob',Number(e.target.value))} min={0} max={100}
                      className="input py-2 text-sm text-center"/>
                    <button onClick={() => removePrize(p.id)}
                      className="w-9 h-9 border border-[#252525] rounded-lg text-[#555] hover:border-red-500 hover:text-red-400 transition-all flex items-center justify-center">
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {/* Prob bar */}
              <div className="h-2 rounded-full overflow-hidden flex mb-1">
                {prizes.map(p => (
                  <div key={p.id} style={{width:`${totalProb>0?p.prob/totalProb*100:0}%`,background:p.color}} className="h-full transition-all"/>
                ))}
              </div>
              <div className={`text-right text-xs mb-4 ${Math.abs(totalProb-100)<.1?'text-green-400':'text-orange-400'}`}>
                Total : <strong>{totalProb}%</strong> {Math.abs(totalProb-100)<.1 ? '✓' : '⚠️ doit faire 100'}
              </div>
              <button onClick={addPrize}
                className="w-full border border-dashed border-[#252525] rounded-xl py-3 text-[#777] text-sm hover:border-gold hover:text-gold transition-all">
                + Ajouter un lot
              </button>
            </div>
          </div>
        )}

        {/* ════ QR CODE ════ */}
        {tab === 'qr' && (
          <div className="animate-fadeUp max-w-lg">
            <h1 className="font-display font-black text-2xl mb-7">QR Code <span className="text-gold">📱</span></h1>
            <div className="bg-[#111] border border-[#1c1c1c] rounded-2xl p-6">
              <div className="flex gap-6 flex-wrap items-start">
                <div className="bg-white rounded-2xl p-5 flex flex-col items-center gap-3 flex-shrink-0">
                  {clientUrl && <QRCode value={clientUrl} size={170} fgColor="#080808" bgColor="#fff"/>}
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{venueName}</p>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <p className="text-sm text-[#777] mb-4 leading-relaxed">
                    Imprime ce QR code et pose-le sur tes tables. Quand un client le scanne, il arrive directement sur ta page personnalisée.
                  </p>
                  <div className="bg-[#080808] border border-[#1c1c1c] rounded-xl p-3 text-xs text-[#777] break-all mb-4 font-mono">{clientUrl}</div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => navigator.clipboard.writeText(clientUrl)}
                      className="btn-dark text-sm px-4 py-2.5">📋 Copier</button>
                    <a href={clientUrl} target="_blank" rel="noreferrer"
                      className="btn-dark text-sm px-4 py-2.5 inline-block">↗ Ouvrir</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
