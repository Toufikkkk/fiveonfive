'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { getVoucherByCode, redeemVoucher, type Voucher } from '@/lib/firestore'

export default function RedeemPage() {
  const { code }   = useParams<{ code: string }>()
  const search     = useSearchParams()
  const venueId    = search.get('venue') || ''
  const [voucher, setVoucher]   = useState<Voucher | null>(null)
  const [status, setStatus]     = useState<'loading'|'valid'|'used'|'invalid'>('loading')
  const [confirm, setConfirm]   = useState(false)
  const [redeeming, setRedeeming] = useState(false)

  useEffect(() => {
    if (!code || !venueId) { setStatus('invalid'); return }
    getVoucherByCode(venueId, code).then(v => {
      if (!v) { setStatus('invalid'); return }
      setVoucher(v)
      setStatus(v.used ? 'used' : 'valid')
    })
  }, [code, venueId])

  async function handleRedeem() {
    if (!voucher?.id) return
    setRedeeming(true)
    await redeemVoucher(venueId, voucher.id)
    setVoucher({ ...voucher, used:true, usedAt:new Date().toISOString() })
    setStatus('used')
    setConfirm(false)
    setRedeeming(false)
  }

  const em = voucher?.prize?.match(/[\u{1F300}-\u{1FFFF}]|\p{Emoji_Presentation}/u)?.[0]
  const prizeText = voucher?.prize?.replace(/[\u{1F300}-\u{1FFFF}]|\p{Emoji_Presentation}/gu,'').trim()
  const usedAt = voucher?.usedAt ? new Date(voucher.usedAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '—'
  const createdAt = voucher?.createdAt ? new Date(voucher.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '—'

  return (
    <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-10 text-center">

      {/* LOGO */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center font-display font-black text-xs text-[#080808]">5/5</div>
        <span className="font-display font-black text-base">Five<span className="text-gold">On</span>Five</span>
      </div>

      {/* LOADING */}
      {status === 'loading' && (
        <div>
          <div className="w-10 h-10 border-2 border-[#1c1c1c] border-t-gold rounded-full animate-spin mx-auto mb-4"/>
          <p className="text-[#888] text-sm">Vérification du bon…</p>
        </div>
      )}

      {/* VALID */}
      {status === 'valid' && voucher && (
        <div className="w-full max-w-sm bg-[#101010] border-2 border-green-500/30 rounded-2xl p-7 animate-[pop_0.4s_cubic-bezier(0.34,1.56,0.64,1)]">
          <span className="text-7xl block mb-4 animate-bounce">{em || '🎁'}</span>
          <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-5">
            ✓ Bon valide
          </div>
          <div className="bg-gold/5 border border-gold/20 rounded-2xl p-5 mb-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#888] mb-2">Lot à servir</p>
            <p className="font-display font-black text-2xl text-gold">
              <span className="inline-block w-3 h-3 rounded-full mr-2 align-middle" style={{background:voucher.prizeColor}}/>
              {prizeText}
            </p>
          </div>
          <p className="font-display font-black text-base tracking-widest text-[#888] mb-2">{code}</p>
          <p className="text-xs text-[#555] mb-6">Généré à {createdAt} · Non encore utilisé</p>
          <button onClick={() => setConfirm(true)}
            className="w-full bg-green-500 text-[#080808] font-bold py-4 rounded-2xl hover:-translate-y-0.5 transition-all shadow-[0_6px_24px_rgba(34,197,94,.3)] hover:bg-green-400 text-base">
            ✓ Marquer comme servi
          </button>
        </div>
      )}

      {/* USED */}
      {status === 'used' && voucher && (
        <div className="w-full max-w-sm bg-[#101010] border-2 border-orange-400/30 rounded-2xl p-7">
          <span className="text-7xl block mb-4">⚠️</span>
          <div className="inline-flex items-center gap-2 bg-orange-400/10 text-orange-400 border border-orange-400/20 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-5">
            Déjà utilisé
          </div>
          <div className="bg-orange-400/5 border border-orange-400/15 rounded-xl p-4 mb-5 text-left">
            <p className="font-bold text-orange-300 text-sm mb-1">Ce bon a déjà été servi</p>
            <p className="text-xs text-[#888]">Utilisé à {usedAt}</p>
          </div>
          <div className="bg-gold/5 border border-gold/15 rounded-xl p-4 mb-5">
            <p className="text-xs text-[#888] mb-1">Lot concerné</p>
            <p className="font-display font-bold text-base text-gold">{em} {prizeText}</p>
          </div>
          <p className="font-display font-black text-sm tracking-widest text-[#888]">{code}</p>
        </div>
      )}

      {/* INVALID */}
      {status === 'invalid' && (
        <div className="w-full max-w-sm bg-[#101010] border-2 border-red-500/30 rounded-2xl p-7">
          <span className="text-7xl block mb-4">❌</span>
          <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-5">
            Bon invalide
          </div>
          <p className="text-[#888] text-sm mb-6">Ce bon est introuvable ou expiré.</p>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#1a1a1a] border border-[#252525] rounded-2xl p-8 w-full max-w-xs text-center">
            <h3 className="font-display font-black text-xl mb-2">Confirmer</h3>
            <p className="text-[#888] text-sm mb-2 leading-relaxed">Tu vas marquer ce bon comme utilisé :</p>
            <p className="text-gold font-bold text-lg mb-6">{voucher?.prize}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(false)}
                className="flex-1 border border-[#252525] text-[#888] font-semibold py-3.5 rounded-xl hover:border-red-500 hover:text-red-400 transition-all">
                Annuler
              </button>
              <button onClick={handleRedeem} disabled={redeeming}
                className="flex-1 bg-green-500 text-[#080808] font-bold py-3.5 rounded-xl hover:bg-green-400 transition-all disabled:opacity-40">
                {redeeming ? '...' : '✓ Servir'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-[-30px] right-[-20px] font-display font-black text-[140px] text-white/[0.02] pointer-events-none select-none z-0">5/5</div>
    </main>
  )
}
