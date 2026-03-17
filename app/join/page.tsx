'use client'
import { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { createVenue, getVenueBySlug, slugify } from '@/lib/firestore'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function JoinPage() {
  const router   = useRouter()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr]           = useState('')
  const [loading, setLoading]   = useState(false)

  async function submit() {
    if (!name.trim() || !email || password.length < 6) {
      setErr('Remplis tous les champs (mot de passe min. 6 caractères)'); return
    }
    setLoading(true); setErr('')
    try {
      const slug = slugify(name)
      if (!slug) throw new Error('Nom invalide')
      const exists = await getVenueBySlug(slug)
      if (exists) throw new Error('Ce nom est déjà pris, essaie une variante')
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await createVenue({ slug, venueName: name, ownerUid: cred.user.uid, ownerEmail: email })
      router.push('/dashboard')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur'
      setErr(msg.includes('email-already-in-use') ? 'Email déjà utilisé' : msg)
    }
    setLoading(false)
  }

  const slug = slugify(name)

  return (
    <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="flex items-center gap-3 mb-10">
        <div className="w-9 h-9 bg-gold rounded-xl flex items-center justify-center font-display font-black text-[10px] text-[#080808]">5/5</div>
        <span className="font-display font-black text-sm">Five<span className="text-gold">On</span>Five</span>
      </Link>

      <div className="w-full max-w-sm bg-[#101010] border border-[#1c1c1c] rounded-2xl p-8">
        <h1 className="font-display font-black text-xl mb-1">Créer mon espace</h1>
        <p className="text-[#888] text-sm mb-6">Gratuit · Prêt en 2 minutes</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#888] mb-2">Nom de l&apos;établissement</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Le Bar du Coin"
              className="input" onKeyDown={e => e.key==='Enter' && submit()}/>
            {slug && <p className="text-[10px] text-[#555] mt-1">Page client : fiveonfive.io/<strong className="text-[#888]">{slug}</strong></p>}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#888] mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@bar.fr"
              className="input" onKeyDown={e => e.key==='Enter' && submit()}/>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#888] mb-2">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 caractères"
              className="input" onKeyDown={e => e.key==='Enter' && submit()}/>
          </div>
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <button onClick={submit} disabled={loading} className="btn-gold w-full py-3.5 text-sm mt-1">
            {loading ? 'Création...' : 'Créer mon espace 🚀'}
          </button>
        </div>
        <p className="text-center text-xs text-[#555] mt-5">
          Déjà un compte ? <Link href="/login" className="text-gold hover:underline">Connexion</Link>
        </p>
      </div>
    </main>
  )
}
