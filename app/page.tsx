'use client'
import Link from 'next/link'

export default function Landing() {
  return (
    <main className="relative z-10 min-h-screen flex flex-col">
      {/* NAV */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1c1c1c]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gold rounded-xl flex items-center justify-center font-display font-black text-[10px] text-[#080808]">5/5</div>
          <span className="font-display font-black text-sm">Five<span className="text-gold">On</span>Five</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-[#888] hover:text-white transition-colors">Connexion</Link>
          <Link href="/join" className="btn-gold text-sm px-5 py-2.5">Essai gratuit →</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="inline-flex items-center gap-2 bg-[#101010] border border-[#1c1c1c] rounded-full px-4 py-2 text-xs font-semibold text-[#888] mb-8">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/>
          Boostez votre réputation en 5 minutes
        </div>
        <h1 className="font-display font-black text-4xl md:text-6xl lg:text-7xl leading-[1.05] mb-5 max-w-4xl">
          Plus d&apos;avis Google.<br/><span className="text-gold">Plus d&apos;abonnés.</span><br/>Sans effort.
        </h1>
        <p className="text-[#888] text-base md:text-lg max-w-lg mb-10 leading-relaxed">
          Vos clients scannent un QR code, accomplissent 2-3 actions en ligne, et gagnent un cadeau tiré au sort. Vous récoltez avis & abonnés automatiquement.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link href="/join" className="btn-gold text-base px-8 py-4 shadow-[0_8px_32px_rgba(245,197,24,.3)]">
            Créer mon espace — c&apos;est gratuit →
          </Link>
          <span className="text-xs text-[#555]">Sans carte bancaire</span>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 pb-20 max-w-5xl mx-auto w-full">
        <h2 className="font-display font-black text-xl text-center mb-10">Comment ça marche ?</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { n:'01', icon:'📱', t:'QR Code sur tables',    d:'Imprimez votre QR code et posez-le.' },
            { n:'02', icon:'⭐', t:'Actions en ligne',      d:'Avis Google, Instagram, TikTok...' },
            { n:'03', icon:'🎰', t:'Roue des cadeaux',      d:'Le client tourne et gagne un lot.' },
            { n:'04', icon:'📲', t:'SMS de confirmation',   d:'Reçoit son bon par SMS, vient le récupérer.' },
          ].map(({ n,icon,t,d }) => (
            <div key={n} className="bg-[#101010] border border-[#1c1c1c] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-display font-black text-xs text-[#2a2a2a]">{n}</span>
                <span className="text-2xl">{icon}</span>
              </div>
              <p className="font-display font-bold text-sm mb-1">{t}</p>
              <p className="text-xs text-[#888] leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#1c1c1c] px-8 py-5 flex items-center justify-between text-xs text-[#555]">
        <span className="font-display font-black text-sm">Five<span className="text-gold">On</span>Five</span>
        <span>© 2025 — Tous droits réservés</span>
      </footer>
    </main>
  )
}
