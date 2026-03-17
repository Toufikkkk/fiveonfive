'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams }  from 'next/navigation'
import { getVenueBySlug, incrementScan, normalizePhone, type Venue, type Prize, type StepKey } from '@/lib/firestore'
import SpinWheel from '@/components/SpinWheel'

type Screen = 'loading' | 'steps' | 'spin' | 'claim' | 'success'
const STEP_LABEL: Record<StepKey, { icon: string; title: string; cta: string; done: string }> = {
  google:    { icon:'⭐', title:'Laisse-nous un <accent>avis Google</accent>', cta:'⭐ Noter sur Google', done:'Merci ! Reviens ici après ton avis 🙏' },
  instagram: { icon:'📸', title:'Suis-nous sur <accent>Instagram</accent>',   cta:'📸 Suivre sur Instagram', done:'Super ! Étape suivante →' },
  tiktok:    { icon:'🎵', title:'Suis-nous sur <accent>TikTok</accent>',       cta:'🎵 Suivre sur TikTok',   done:'Super ! Étape suivante →' },
  facebook:  { icon:'👍', title:'Suis-nous sur <accent>Facebook</accent>',     cta:'👍 Suivre sur Facebook', done:'Super ! Étape suivante →' },
}
const STEP_LINK: Record<StepKey, keyof Venue> = {
  google:'googleUrl', instagram:'instagramUrl', tiktok:'tiktokUrl', facebook:'facebookUrl',
}

export default function ClientPage() {
  const { slug }  = useParams<{ slug: string }>()
  const [venue, setVenue]         = useState<Venue | null>(null)
  const [screen, setScreen]       = useState<Screen>('loading')
  const [stepIdx, setStepIdx]     = useState(0)
  const [stepDone, setStepDone]   = useState(false)
  const [rotation, setRotation]   = useState(0)
  const [spinning, setSpinning]   = useState(false)
  const [wonPrize, setWonPrize]   = useState<Prize | null>(null)
  // Claim form
  const [phone, setPhone]         = useState('')
  const [email, setEmail]         = useState('')
  const [claimErr, setClaimErr]   = useState('')
  const [claiming, setClaiming]   = useState(false)
  // Success
  const [code, setCode]           = useState('')
  const rafRef = useRef<number>(0)

  useEffect(() => {
    getVenueBySlug(slug).then(v => {
      if (!v) return
      setVenue(v)
      if (v.id) incrementScan(v.id)
      setScreen('steps')
    })
  }, [slug])

  // ── Cleanup on unmount ──
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  const totalSteps = venue?.steps?.length || 0
  const currentStep = venue?.steps?.[stepIdx] as StepKey | undefined
  const meta = currentStep ? STEP_LABEL[currentStep] : null

  function onStepClick() {
    setTimeout(() => setStepDone(true), 2200)
  }

  function nextStep() {
    if (stepIdx < totalSteps - 1) {
      setStepIdx(i => i+1); setStepDone(false)
    } else {
      setScreen('spin')
    }
  }

  const spin = useCallback(() => {
    if (!venue || spinning) return
    setSpinning(true)
    const prizes = venue.prizes
    const total  = prizes.reduce((s,p) => s+p.prob, 0)
    let rand = Math.random() * total; let winIdx = 0
    for (let i=0;i<prizes.length;i++) { rand -= prizes[i].prob; if (rand<=0) { winIdx=i; break } }
    let acc = 0
    const mids = prizes.map(p => { const s=(p.prob/total)*360; const m=acc+s/2; acc+=s; return m })
    let delta = ((360-mids[winIdx]%360)%360) - (rotation%360)
    if (delta<=0) delta+=360
    const startA = rotation, endA = rotation+5*360+delta, dur=4800; let t0=0

    function frame(ts: number) {
      if (!t0) t0=ts
      const t = Math.min((ts-t0)/dur, 1)
      const eased = 1-Math.pow(1-t,4)
      setRotation(startA+(endA-startA)*eased)
      if (t<1) { rafRef.current=requestAnimationFrame(frame) }
      else { setRotation(endA); setSpinning(false); setWonPrize(prizes[winIdx]); setScreen('claim') }
    }
    rafRef.current = requestAnimationFrame(frame)
  }, [venue, spinning, rotation])

  async function claim() {
    if (!phone || !email) { setClaimErr('Remplis tous les champs'); return }
    if (!wonPrize || !venue?.id) return
    setClaiming(true); setClaimErr('')

    // Check phone first
    const check = await fetch('/api/check-phone', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ phone, venueId: venue.id })
    }).then(r=>r.json())

    if (check.used) {
      setClaimErr('Ce numéro a déjà participé. 1 numéro = 1 tour de roue.'); setClaiming(false); return
    }

    // Send SMS + save
    const res = await fetch('/api/send-sms', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        phone, email,
        prize:      wonPrize.label,
        prizeColor: wonPrize.color,
        venueId:    venue.id,
        venueName:  venue.venueName,
      })
    }).then(r=>r.json())

    if (res.error) { setClaimErr(res.error); setClaiming(false); return }
    setCode(res.code); setScreen('success')
    setClaiming(false)
  }

  const pc = venue?.primaryColor || '#F5C518'

  // ── Confetti ──
  const [confetti, setConfetti] = useState<{id:number;x:number;color:string;r:number;d:number}[]>([])
  useEffect(() => {
    if (screen==='success') {
      const cols = [pc,'#FF6B35','#4ECDC4','#fff','#FF9ECD']
      setConfetti(Array.from({length:60},(_,i)=>({id:i,x:Math.random()*100,color:cols[i%cols.length],r:3+Math.random()*6,d:Math.random()*1.2})))
    }
  }, [screen, pc])

  const titleWithAccent = (t: string) => {
    const [before, mid, after] = t.split(/<accent>|<\/accent>/)
    return <>{before}<span style={{color:pc}}>{mid}</span>{after}</>
  }

  if (!venue && screen === 'loading') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-2 border-[#1c1c1c] rounded-full animate-spin" style={{borderTopColor:pc}}/>
    </div>
  )

  return (
    <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-10 text-center overflow-hidden">

      {/* Confetti */}
      {screen==='success' && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {confetti.map(c => (
            <div key={c.id} className="absolute rounded-sm"
              style={{left:`${c.x}%`,top:'-20px',width:c.r,height:c.r,background:c.color,
                animation:`fall ${1.5+c.d}s ease-in ${c.d}s forwards`,
                borderRadius: c.id%3===0 ? '50%' : '2px'}}/>
          ))}
          <style>{`@keyframes fall{to{top:110vh;transform:rotate(720deg);opacity:0}}`}</style>
        </div>
      )}

      {/* Logo */}
      {screen !== 'loading' && (
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-[10px] text-[#080808]"
            style={{background:pc}}>{venue?.logoEmoji||'⭐'}</div>
          <span className="font-display font-black text-sm">{venue?.venueName}</span>
        </div>
      )}

      {/* Progress dots */}
      {(screen==='steps'||screen==='spin'||screen==='claim'||screen==='success') && (
        <div className="flex gap-1.5 mb-7">
          {[...(venue?.steps||[]).map((_,i)=>i), 'spin','claim'].map((s,idx,arr) => {
            const cur = screen==='steps' ? stepIdx : screen==='spin' ? totalSteps : screen==='claim' ? totalSteps+1 : arr.length
            return <div key={idx} className="w-6 h-1.5 rounded-full transition-all duration-500"
              style={{background: idx<cur?'#22C55E':idx===cur?pc:'#1c1c1c'}}/>
          })}
        </div>
      )}

      {/* ── STEPS ── */}
      {screen === 'steps' && meta && currentStep && (
        <div className="flex flex-col items-center max-w-xs w-full animate-fadeUp">
          <div className="text-5xl mb-4">{meta.icon}</div>
          <h1 className="font-display font-black text-2xl leading-tight mb-3">
            {titleWithAccent(meta.title)}
          </h1>
          <p className="text-[#777] text-sm mb-8 leading-relaxed">
            Étape {stepIdx+1}/{totalSteps} · Roue des cadeaux après 🎰
          </p>
          <a href={(venue?.[STEP_LINK[currentStep]] as string)||'#'} target="_blank" rel="noreferrer"
            onClick={onStepClick}
            className="flex items-center justify-center gap-2 w-full font-semibold py-4 rounded-2xl mb-3 text-[#080808] hover:-translate-y-0.5 transition-transform text-sm"
            style={{background:pc}}>
            {meta.cta}
          </a>
          <button disabled={!stepDone} onClick={nextStep}
            className="w-full bg-[#1c1c1c] text-[#888] font-semibold py-4 rounded-2xl disabled:opacity-30 hover:bg-[#252525] hover:text-white transition-all text-sm disabled:cursor-not-allowed">
            {stepIdx < totalSteps-1 ? 'Étape suivante →' : 'Aller à la roue 🎰'}
          </button>
          <p className={`text-xs mt-2 transition-colors ${stepDone?'text-green-400':'text-[#555]'}`}>
            {stepDone ? meta.done : 'Clique d\'abord sur le bouton ☝️'}
          </p>
        </div>
      )}

      {/* ── SPIN ── */}
      {screen === 'spin' && venue && (
        <div className="flex flex-col items-center animate-fadeUp">
          <h1 className="font-display font-black text-3xl leading-tight mb-2">
            Tourne la <span style={{color:pc}}>roue</span> !
          </h1>
          <p className="text-[#777] text-sm mb-5">Un cadeau t&apos;attend 🎰</p>
          <SpinWheel prizes={venue.prizes} rotation={rotation}/>
          <button disabled={spinning} onClick={spin}
            className="mt-5 font-display font-black text-lg text-[#080808] px-12 py-5 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-1 hover:scale-105"
            style={{background:`linear-gradient(135deg,${pc},#FF6B35)`,boxShadow:`0 8px 28px ${pc}50`}}>
            {spinning ? '...' : '🎯 TOURNER'}
          </button>
        </div>
      )}

      {/* ── CLAIM ── */}
      {screen === 'claim' && wonPrize && (
        <div className="flex flex-col items-center max-w-xs w-full animate-pop">
          <div className="text-5xl mb-3 animate-bob">
            {wonPrize.label.match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/u)?.[0] || '🎁'}
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#777] mb-1">Tu gagnes</p>
          <p className="font-display font-black text-xl mb-5 leading-tight" style={{color:pc}}>
            {wonPrize.label.replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu,'').trim()}
          </p>

          <div className="w-full bg-[#101010] border border-[#1c1c1c] rounded-2xl p-5 mb-3">
            <p className="text-xs text-[#777] mb-4 text-center leading-relaxed">
              Renseigne ton numéro pour recevoir ton bon par SMS 📲
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#777] mb-1.5">Téléphone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} type="tel"
                  placeholder="06 12 34 56 78" className="input"/>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#777] mb-1.5">Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                  placeholder="toi@email.fr" className="input"/>
              </div>
            </div>
            {claimErr && <p className="text-red-400 text-xs mt-3">{claimErr}</p>}
            <button onClick={claim} disabled={claiming}
              className="w-full mt-4 font-bold py-3.5 rounded-xl text-[#080808] text-sm disabled:opacity-40 transition-all hover:-translate-y-0.5"
              style={{background:pc}}>
              {claiming ? 'Envoi du SMS...' : 'Recevoir mon bon par SMS 📲'}
            </button>
          </div>
          <p className="text-[10px] text-[#555] leading-relaxed text-center">
            Tes infos ne seront jamais partagées. 1 participation par numéro.
          </p>
        </div>
      )}

      {/* ── SUCCESS ── */}
      {screen === 'success' && wonPrize && (
        <div className="flex flex-col items-center max-w-xs w-full animate-pop">
          <div className="text-6xl mb-4 animate-bob">
            {wonPrize.label.match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/u)?.[0] || '🎉'}
          </div>
          <h1 className="font-display font-black text-2xl mb-2">SMS envoyé ! 📲</h1>
          <p className="text-[#777] text-sm mb-6 leading-relaxed">
            Vérifie tes SMS. Montre ton bon au comptoir pour récupérer ton lot.
          </p>
          <div className="w-full bg-[#101010] border rounded-2xl p-5 mb-4" style={{borderColor:`${pc}30`}}>
            <p className="text-xs text-[#777] uppercase tracking-widest mb-2">Ton lot</p>
            <p className="font-display font-black text-lg" style={{color:pc}}>
              {wonPrize.label.replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu,'').trim()}
            </p>
            <div className="mt-3 pt-3 border-t border-[#1c1c1c]">
              <p className="text-xs text-[#555] mb-1">Code</p>
              <p className="font-display font-black text-base tracking-widest text-[#888]">{code}</p>
            </div>
          </div>
          <div className="bg-orange-400/8 border border-orange-400/20 rounded-2xl p-4 w-full text-center">
            <p className="text-orange-300 text-xs font-semibold">⚠️ Valable uniquement ce soir</p>
            <p className="text-[#777] text-xs mt-1">Montre ton SMS au serveur pour le récupérer</p>
          </div>
        </div>
      )}

      {/* Deco */}
      <div className="fixed bottom-[-30px] right-[-20px] font-display font-black text-[130px] pointer-events-none select-none z-0 leading-none"
        style={{color:`${pc}05`}}>5/5</div>
    </main>
  )
}
