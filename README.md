# FiveOnFive 🎰

Mini SaaS — Boostez votre réputation en ligne en 5 minutes.

---

## 🗺️ Pages

| URL | Description |
|---|---|
| `/` | Landing page |
| `/join` | Inscription commerçant |
| `/login` | Connexion commerçant |
| `/dashboard` | Dashboard commerçant (stats, clients, roue, étapes, QR) |
| `/[slug]` | **Page client** (QR → actions → roue → SMS) |

---

## 🚀 Setup de A à Z

### ÉTAPE 1 — Installer Node.js
https://nodejs.org → télécharge la version LTS et installe.

### ÉTAPE 2 — Installer les dépendances
```bash
cd fiveonfive
npm install
```

### ÉTAPE 3 — Configurer les variables d'environnement
```bash
cp .env.local.example .env.local
```
Ton fichier `.env.local` contient déjà les clés Firebase.
Il te manque les clés Twilio (voir ci-dessous).

---

## 🔥 Firebase — Configuration

### 1. Activer Firestore
1. https://console.firebase.google.com → ton projet **noteo-341b5**
2. **Firestore Database** → Créer une base de données
3. Choisir **Mode test** → Suivant → Terminer

### 2. Activer Firebase Auth
1. **Authentication** → Commencer
2. **Méthode de connexion** → Email/Mot de passe → Activer → Enregistrer

### 3. Règles Firestore (colle ça dans l'onglet Règles)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
(à sécuriser plus tard pour la prod)

---

## 📲 Twilio — Envoi SMS

### 1. Créer un compte
https://twilio.com → Sign up (gratuit, 15€ de crédit offert)

### 2. Récupérer tes clés
Console Twilio → Dashboard :
- **Account SID** → copie dans `.env.local` → `TWILIO_ACCOUNT_SID`
- **Auth Token** → copie dans `.env.local` → `TWILIO_AUTH_TOKEN`

### 3. Acheter un numéro de téléphone
Console → Phone Numbers → Manage → Buy a number
- Cherche un numéro **France (+33)**
- Achète (~1€/mois)
- Copie le numéro dans `.env.local` → `TWILIO_PHONE_NUMBER`

### Exemple `.env.local` complet :
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCL8MTWv2Mq2LzTRynURRseGw8D-dHUuBk
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=noteo-341b5.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=noteo-341b5
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=noteo-341b5.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=567896929838
NEXT_PUBLIC_FIREBASE_APP_ID=1:567896929838:web:633a988e1158d32d38d1bf

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+33xxxxxxxxx

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## ▶️ Lancer en local
```bash
npm run dev
```
→ Ouvre http://localhost:3000

### Tester le flow complet :
1. Va sur http://localhost:3000/join → crée un compte commerçant
2. Tu atterris sur le dashboard → configure tes liens Google/Instagram
3. Dans "QR Code" → copie le lien de ta page client
4. Ouvre ce lien dans un autre onglet → teste le flow client

---

## 🌐 Déployer sur Vercel (5 min)

### 1. Créer un compte GitHub et pousser le projet
```bash
git init
git add .
git commit -m "init fiveonfive"
```
Crée un repo sur github.com → suis les instructions pour pousser.

### 2. Créer un compte Vercel
https://vercel.com → Signup avec GitHub

### 3. Importer le projet
1. Dashboard Vercel → **Add New Project**
2. Importe ton repo GitHub
3. Section **Environment Variables** → ajoute TOUTES les variables de ton `.env.local`
4. **Deploy** → 2 minutes → c'est en ligne !

### 4. Mettre à jour `NEXT_PUBLIC_APP_URL`
Dans Vercel → Settings → Environment Variables :
- `NEXT_PUBLIC_APP_URL` = `https://ton-domaine.vercel.app`

### 5. Domaine custom (optionnel)
Vercel → Settings → Domains → ajoute `fiveonfive.io`

---

## 🗄️ Structure Firestore

```
venues/
  {venueId}/
    slug, venueName, ownerUid, ownerEmail
    googleUrl, instagramUrl, tiktokUrl, facebookUrl
    steps: ['google', 'instagram']   ← étapes activées (ordonnées)
    prizes: [{id, label, color, prob}]
    scanCount, spinCount
    primaryColor, logoEmoji
    createdAt

    clients/
      {clientId}/
        phone: "+33612345678"   ← normalisé, unique par venue
        email
        prize, prizeColor
        voucherCode: "A3BX-K7YZ"
        createdAt
```

---

## 🔒 Anti-abus

- **1 numéro de téléphone = 1 tour de roue** par commerce
- Vérification côté serveur (API route Next.js) avant envoi SMS
- Impossible à contourner côté client

---

## 💰 Prochaines étapes produit

- [ ] Stripe pour monétiser (abonnement mensuel)
- [ ] Personalisation avancée (couleurs, logo image)
- [ ] Stats par période (jour/semaine/mois)
- [ ] Export CSV de la base clients
- [ ] Email de bienvenue client (Resend)
- [ ] Multi-établissements
