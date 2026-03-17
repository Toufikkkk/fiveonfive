'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  getVenueBySlug, updateVenue, getRecentVouchers,
  type Venue, type Prize, type Voucher
} from '@/lib/firestore'
import QRCode from 'react-qr-code'

type Tab = 'dashboard' | 'settings' | 'prizes' | 'qr'

export default function AdminPage() {
  const { slug } = useParams<{ slug: string }>()
  const router   = useRouter()
  const [venue, setVenue]     = useState<Venue | null>(null)
  const [tab, setTab]         = useState<Tab>('dashboard')
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [authReady, setAuthReady] = useState(false)

  // ─── AUTH GUARD ───
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) { router.push('/login'); return }
      setAuthReady(true)
    })
    return () => unsub()
  }, [router])

  // ─── LOAD DATA ───
  useEffect(() => {
    if (!authReady) return
    getVenueBySlug(slug).then(v => {
      if (!v) return
      // Guard: only owner
      if (v.ownerEmail !== auth.currentUser?.email) { router.push('/'); return }
      setVenue(v)
      getRecentVouchers(v.id!).then(setVouchers)
    })
  }, [slug, authReady, router])

  // ─── FORM STATE ───
  const [name, setName]       = useState('')
  const [googleUrl, setGoogleUrl] = useState('')
  const [instaUrl, setInstaUrl]   = useState('')
  const [prizes, setPrizes]   = useState<Prize[]>([])

  useEffect(() => {
    if (!venue) return
    setName(venue.venueName)
    setGoogleUrl(venue.googleUrl)
    setInstaUrl(venue.instagramUrl)
    setPrizes(venue.prizes)
  }, [venue])

  async function save() {
    if (!venue?.id) return
    setSaving(true)
    await updateVenue(venue.id, { venueName:name, googleUrl, instagramUrl:instaUrl, prizes })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function addPrize() {
    setPrizes([...prizes, { label:'Nouveau lot', color:'#888888', prob:10 }])
  }
  function updatePrize(i: number, key: keyof Prize, val: string | number) {
    const next = [...prizes]; (next[i] as Record<string, unknown>)[key] = val; setPrizes(next)
  }
  function removePrize(i: number) {
    setPrizes(prizes.filter((_,idx) => idx !== i))
  }

  const totalProb = prizes.reduce((s,p) => s+Number(p.prob), 0)
  const scans     = venue?.scanCount  || 0
  const spins     = venue?.spinCount  || 0
  const conv      = scans > 0 ? Math.round(spins/scans*100) : 0
  const prizeCount = vouchers.filter(v => v.used).length
  const clientUrl  = typeof window !== 'undefined' ? `${window.location.origin}/${slug}` : `https://fiveonfive.io/${slug}`
  const countByPrize: Record<string,number> = {}
  vouchers.filter(v => v.prize).forEach(v => { countByPrize[v.prize] = (countByPrize[v.prize]||0)+1 })

  if (!authReady || !venue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#1c1c1c] border-t-gold rounded-full animate-spin"/>
      </div>
    )
  }

  const navItems: { id: Tab; icon: string; label: string }[] = [
    { id:'dashboard', icon:'📊', label:'Dashboard' },
    { id:'settings',  icon:'⚙️', label:'Paramètres' },
    { id:'prizes',    icon:'🎁', label:'Lots & Roue' },
    { id:'qr',        icon:'📱', label:'QR Code' },
  ]

  return (
    <div className="flex min-h-screen">
      {/* SIDEBAR */}
      <aside className="w-[220px] flex-shrink-0 bg-[#0f0f0f] border-r border-[#1e1e1e] flex flex-col fixed top-0 left-0 bottom-0 z-50">
        <div className="px-5 py-7 border-b border-[#1e1e1e] mb-3">
          <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center font-display font-black text-xs text-[#080808] mb-3">5/5</div>
          <div className="font-display font-black text-base">Five<span className="text-gold">On</span>Five</div>
          <div className="text-[10px] text-[#555] uppercase tracking-widest mt-1">Dashboard</div>
        </div>
        <nav className="flex-1 px-2">
          {navItems.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium mb-1 transition-all ${tab===n.id ? 'bg-gold/10 text-gold border border-gold/15' : 'text-[#888] hover:text-white hover:bg-white/5'}`}>
              <span className="text-lg w-6">{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[#1e1e1e]">
          <div className="flex items-center gap-2 text-xs text-[#555] mb-3">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"/>
            {venue.venueName}
          </div>
          <a href={`/${slug}`} target="_blank" rel="noreferrer"
            className="block w-full text-center bg-gradient-to-br from-gold to-orange-400 text-[#080808] font-bold text-xs py-2.5 rounded-xl hover:opacity-85 transition-opacity mb-2">
            ▶ Voir page client
          </a>
          <button onClick={() => signOut(auth).then(() => router.push('/login'))}
            className="w-full text-center text-[#555] text-xs hover:text-white transition-colors py-1">
            Déconnexion
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="ml-[220px] flex-1 p-10 relative z-10">

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div>
            <h1 className="font-display font-black text-2xl mb-8">Dashboard <span className="text-gold">📊</span></h1>

            {/* STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label:'Scans QR',     val:scans,  icon:'🔍', color:'text-gold' },
                { label:'Parties jouées',val:spins,  icon:'🎰', color:'text-orange-400' },
                { label:'Taux conv.',   val:conv+'%',icon:'⭐', color:'text-green-400' },
                { label:'Lots servis',  val:prizeCount,icon:'🏆',color:'text-blue-400' },
              ].map(({ label, val, icon, color }) => (
                <div key={label} className="bg-[#141414] border border-[#1e1e1e] rounded-2xl p-5 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-0.5 ${color.replace('text-','bg-')}`}/>
                  <span className="text-3xl block mb-3">{icon}</span>
                  <div className={`font-display font-black text-4xl leading-none mb-1 ${color}`}>{val}</div>
                  <div className="text-xs text-[#888] uppercase tracking-widest font-semibold">{label}</div>
                </div>
              ))}
            </div>

            {/* PRIZE BREAKDOWN */}
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl p-6">
              <h2 className="font-display font-bold text-xs uppercase tracking-widest text-[#888] mb-5 flex items-center gap-2">
                <span className="w-1 h-4 bg-gold rounded inline-block"/>Lots distribués
              </h2>
              {Object.keys(countByPrize).length === 0 ? (
                <p className="text-[#555] text-sm text-center py-8">Aucune partie jouée pour l&apos;instant</p>
              ) : (
                <table className="w-full">
                  <thead><tr className="text-[10px] text-[#555] uppercase tracking-widest border-b border-[#1e1e1e]">
                    <th className="text-left py-2 px-3">Lot</th><th className="text-left py-2 px-3">Gagnés</th><th className="text-left py-2 px-3">%</th>
                  </tr></thead>
                  <tbody>
                    {Object.entries(countByPrize).sort((a,b)=>b[1]-a[1]).map(([prize,count]) => {
                      const p = prizes.find(x=>x.label===prize)
                      const total2 = Object.values(countByPrize).reduce((s,v)=>s+v,0)
                      return (
                        <tr key={prize} className="border-b border-white/[0.03] text-sm">
                          <td className="py-3 px-3 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{background:p?.color||'#888'}}/>
                            {prize}
                          </td>
                          <td className="py-3 px-3 font-bold">{count}</td>
                          <td className="py-3 px-3 text-[#888]">{Math.round(count/total2*100)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* RECENT VOUCHERS */}
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl p-6 mt-5">
              <h2 className="font-display font-bold text-xs uppercase tracking-widest text-[#888] mb-5 flex items-center gap-2">
                <span className="w-1 h-4 bg-gold rounded inline-block"/>Bons récents
              </h2>
              {vouchers.length === 0 ? (
                <p className="text-[#555] text-sm text-center py-8">Aucun bon généré pour l&apos;instant</p>
              ) : (
                <table className="w-full">
                  <thead><tr className="text-[10px] text-[#555] uppercase tracking-widest border-b border-[#1e1e1e]">
                    <th className="text-left py-2 px-3">Code</th><th className="text-left py-2 px-3">Lot</th><th className="text-left py-2 px-3">Créé le</th><th className="text-left py-2 px-3">Statut</th>
                  </tr></thead>
                  <tbody>
                    {vouchers.slice(0,20).map(v => (
                      <tr key={v.id} className="border-b border-white/[0.03] text-sm">
                        <td className="py-3 px-3 font-display font-bold text-xs tracking-widest">{v.code}</td>
                        <td className="py-3 px-3">{v.prize}</td>
                        <td className="py-3 px-3 text-[#888]">{new Date(v.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</td>
                        <td className="py-3 px-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${v.used ? 'bg-orange-400/10 text-orange-400' : 'bg-green-400/10 text-green-400'}`}>
                            {v.used ? '✓ Utilisé' : '⏳ En attente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === 'settings' && (
          <div className="max-w-lg">
            <div className="flex items-center justify-between mb-8">
              <h1 className="font-display font-black text-2xl">Paramètres <span className="text-gold">⚙️</span></h1>
              <button onClick={save} disabled={saving} className="bg-gold text-[#080808] font-bold px-6 py-2.5 rounded-xl hover:bg-yellow-300 transition-all disabled:opacity-40 flex items-center gap-2">
                {saved ? '✓ Sauvegardé' : saving ? 'Enregistrement...' : '💾 Sauvegarder'}
              </button>
            </div>
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl p-6 space-y-5">
              {[
                { label:'Nom du bar', val:name, set:setName, placeholder:'Mon Bar' },
                { label:'Lien Google My Business', val:googleUrl, set:setGoogleUrl, placeholder:'https://search.google.com/local/writereview?placeid=...' },
                { label:'Lien Instagram', val:instaUrl, set:setInstaUrl, placeholder:'https://instagram.com/monbar' },
              ].map(({ label, val, set, placeholder }) => (
                <div key={label}>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-[#888] mb-2">{label}</label>
                  <input value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
                    className="w-full bg-[#080808] border border-[#252525] rounded-xl px-4 py-3 text-white outline-none focus:border-gold transition-colors text-sm"/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PRIZES ── */}
        {tab === 'prizes' && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-8">
              <h1 className="font-display font-black text-2xl">Lots & Roue <span className="text-gold">🎁</span></h1>
              <button onClick={save} disabled={saving} className="bg-gold text-[#080808] font-bold px-6 py-2.5 rounded-xl hover:bg-yellow-300 transition-all disabled:opacity-40">
                {saved ? '✓ Sauvegardé' : saving ? 'Enregistrement...' : '💾 Sauvegarder'}
              </button>
            </div>
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl p-6">
              <p className="text-sm text-[#888] mb-5">Configure les lots et leur probabilité d&apos;apparition. Le total doit faire 100%.</p>
              <div className="grid grid-cols-[36px_1fr_120px_80px_36px] gap-2 mb-2 text-[10px] text-[#555] uppercase tracking-widest px-1">
                <span/>
                <span>Lot</span>
                <span>Code promo</span>
                <span className="text-center">Prob %</span>
                <span/>
              </div>
              <div className="space-y-2 mb-3">
                {prizes.map((p,i) => (
                  <div key={i} className="grid grid-cols-[36px_1fr_120px_80px_36px] gap-2 items-center">
                    <input type="color" value={p.color} onChange={e => updatePrize(i,'color',e.target.value)}
                      className="w-9 h-9 rounded-xl border-2 border-[#252525] cursor-pointer bg-transparent"/>
                    <input value={p.label} onChange={e => updatePrize(i,'label',e.target.value)}
                      className="bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gold transition-colors"/>
                    <input value={''} placeholder="PROMO"
                      className="bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-white text-xs font-display outline-none focus:border-gold transition-colors tracking-widest"/>
                    <input type="number" value={p.prob} onChange={e => updatePrize(i,'prob',Number(e.target.value))}
                      className="bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-white text-sm text-center outline-none focus:border-gold transition-colors"/>
                    <button onClick={() => removePrize(i)}
                      className="w-9 h-9 border border-[#252525] rounded-lg text-[#555] hover:border-red-500 hover:text-red-500 transition-all flex items-center justify-center text-base">
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {/* PROB BAR */}
              <div className="h-1.5 rounded-full overflow-hidden flex mb-1">
                {prizes.map((p,i) => (
                  <div key={i} style={{width:`${totalProb>0?p.prob/totalProb*100:0}%`,background:p.color}} className="h-full transition-all"/>
                ))}
              </div>
              <div className={`text-right text-xs mb-4 ${Math.abs(totalProb-100)<.1 ? 'text-green-400' : 'text-orange-400'}`}>
                Total : <strong>{totalProb}%</strong>
              </div>
              <button onClick={addPrize}
                className="w-full border border-dashed border-[#252525] rounded-xl py-3 text-[#888] text-sm hover:border-gold hover:text-gold transition-all">
                + Ajouter un lot
              </button>
            </div>
          </div>
        )}

        {/* ── QR CODE ── */}
        {tab === 'qr' && (
          <div className="max-w-lg">
            <h1 className="font-display font-black text-2xl mb-8">QR Code <span className="text-gold">📱</span></h1>
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-2xl p-6">
              <div className="flex gap-6 flex-wrap">
                <div className="bg-white rounded-2xl p-5 flex flex-col items-center gap-3 flex-shrink-0">
                  <QRCode value={clientUrl} size={180} fgColor="#080808" bgColor="#fff"/>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{venue.venueName}</p>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm text-[#888] mb-4 leading-relaxed">
                    Place ce QR code sur chaque table. Tes clients scannent, laissent un avis Google, suivent l&apos;Instagram et jouent.
                  </p>
                  <div className="bg-[#080808] border border-[#1e1e1e] rounded-xl p-3 text-xs text-[#888] break-all mb-4">{clientUrl}</div>
                  <button onClick={() => navigator.clipboard.writeText(clientUrl)}
                    className="border border-[#252525] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:border-gold hover:text-gold transition-all mr-2 mb-2">
                    📋 Copier le lien
                  </button>
                  <a href={`/${slug}`} target="_blank" rel="noreferrer"
                    className="inline-block border border-[#252525] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:border-gold hover:text-gold transition-all">
                    ↗ Ouvrir la page
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
