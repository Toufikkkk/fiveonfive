import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FiveOnFive — Boostez votre réputation en 5 minutes',
  description: 'Obtenez plus d\'avis Google, abonnés Instagram et TikTok grâce à une roue des cadeaux gamifiée.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
