import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { phoneAlreadyUsed, saveClient, normalizePhone, genCode } from '@/lib/firestore'

export async function POST(req: NextRequest) {
  const { phone, email, prize, prizeColor, venueId, venueName } = await req.json()

  if (!phone || !email || !prize || !venueId) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const normalized = normalizePhone(phone)

  // ── Anti-abuse: 1 numéro = 1 tour par commerce ──
  const alreadyUsed = await phoneAlreadyUsed(venueId, normalized)
  if (alreadyUsed) {
    return NextResponse.json(
      { error: 'Ce numéro a déjà participé à ce jeu.' },
      { status: 409 }
    )
  }

  // ── Générer le code bon ──
  const code = genCode()

  // ── Calculer la validité (ce soir jusqu'à minuit) ──
  const now = new Date()
  const midnight = new Date()
  midnight.setHours(23, 59, 0, 0)
  const timeStr = midnight.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  // ── SMS message ──
  const smsBody = [
    `🎉 Félicitations !`,
    `Votre bon : ${prize}`,
    `Chez : ${venueName}`,
    `Code : ${code}`,
    `✅ Valable ce soir jusqu'à ${timeStr} (${dateStr})`,
    `Montrez ce SMS à l'accueil pour le récupérer.`,
  ].join('\n')

  // ── Twilio ──
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  )

  try {
    await client.messages.create({
      body: smsBody,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to:   normalized,
    })
  } catch (err) {
    console.error('Twilio error:', err)
    return NextResponse.json({ error: 'Impossible d\'envoyer le SMS. Vérifie ton numéro.' }, { status: 500 })
  }

  // ── Sauvegarder le client dans Firestore ──
  await saveClient(venueId, {
    phone:       normalized,
    email,
    prize,
    prizeColor,
    voucherCode: code,
    venueId,
    createdAt:   new Date().toISOString(),
  })

  return NextResponse.json({ success: true, code })
}
