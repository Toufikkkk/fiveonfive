'use client'
import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr]           = useState('')
  const [loading, setLoading]   = useState(false)

  async function submit() {
    setLoading(true); setErr('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/dashboard')
    } catch { setErr('Email ou mot de passe incorrect') }
    setLoading(false)
  }

  return (
    <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
      <Link href="/" className="flex items-center gap-3 mb-10">
        <div className="w-9 h-9 bg-gold rounded-xl flex items-center justify-center font-display font-black text-[10px] text-[#080808]">5/5</div>
        <span className="font-display font-black text-sm">Five<span className="text-gold">On</span>Five</span>
      </Link>
      <div className="w-full max-w-sm bg-[#101010] border border-[#1c1c1c] rounded-2xl p-8">
        <h1 className="font-display font-black text-xl mb-6">Connexion</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#888] mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@bar.fr"
              className="input" onKeyDown={e => e.key==='Enter' && submit()}/>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#888] mb-2">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              className="input" onKeyDown={e => e.key==='Enter' && submit()}/>
          </div>
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <button onClick={submit} disabled={loading} className="btn-gold w-full py-3.5 text-sm mt-1">
            {loading ? 'Connexion...' : 'Se connecter →'}
          </button>
        </div>
        <p className="text-center text-xs text-[#555] mt-5">
          Pas de compte ? <Link href="/join" className="text-gold hover:underline">Créer un espace</Link>
        </p>
      </div>
    </main>
  )
}
