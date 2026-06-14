# 🎵 Ton-GPT — Chinesische Töne üben

Eine Progressive Web App zum Üben und Bewerten chinesischer Tonaussprache. Schüler nehmen ihre Aussprache auf, vergleichen sie mit Lehrer-Referenzaufnahmen oder mathematischen Standard-Tonverläufen und erhalten detailliertes Feedback.

## ✨ Features

### Schüler
- **Vokabelverwaltung** — Chinesische Wörter mit Pinyin (Symbol & Nummer) anlegen und verwalten
- **Aufnahme & Wiedergabe** — Eigene Aussprache aufnehmen, abspielen und löschen
- **Tonanalyse** — Vergleich der eigenen Tonhöhe mit Lehrer-Audio oder Standard-Tonverlauf
- **Bewertungsdetails** — Tonverlauf, Sprechtempo und Rhythmus als separate Metriken
- **Übungskalender** — Tägliche Übungsaktivität im Kalender-Heatmap
- **Lehrer-Bewertung beantragen** — Direkt von der Vokabelseite aus eine Bewertung anfragen
- **TTS-Vorleser** — Chinesische Wörter mit nativer Mandarin-Stimme vorlesen lassen
- **Passwort ändern** — Eigenes Passwort in den Einstellungen ändern
- **Passwort vergessen** — Anfrage an den Lehrer senden, der das Passwort zurücksetzt

### Lehrer
- **Anfragen-Dashboard** — Übersicht aller Schüler-Bewertungsanfragen mit Ungelesen-Badge
- **Audio-Bewertung** — Schüler-Aufnahmen anhören, Feedback geben und Referenz-Audio aufnehmen
- **Schülerverwaltung** — Schüler einem Lehrer zuordnen (direkt im Dashboard)
- **Passwort-Reset** — Schüler-Passwörter auf Standardwert zurücksetzen
- **Lehrer registrieren** — Neue Lehrer-Accounts erstellen
- **Hell-/Dunkel-Modus** — Individuell umschaltbar

### Allgemein
- **PWA** — Installierbar auf Mobilgeräten als App
- **Offline-fähig** — Audiodaten lokal in IndexedDB gespeichert
- **Responsive Design** — Optimiert für Mobile und Desktop
- **Vollständig auf Deutsch** — Alle UI-Texte in deutscher Sprache

## 🛠 Tech-Stack

| Technologie | Verwendung |
|---|---|
| [Next.js 15](https://nextjs.org) (Turbopack) | Framework |
| [React 19](https://react.dev) | UI |
| [Tailwind CSS v4](https://tailwindcss.com) | Styling |
| [Supabase](https://supabase.com) | Auth & Datenbank |
| [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (via `idb`) | Lokale Audio-Speicherung |
| [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) | Pitch-Analyse |
| [Serwist](https://serwist.pages.dev) | Service Worker / PWA |
| [pinyin-pro](https://github.com/zh-lx/pinyin-pro) | Pinyin-Generierung |

## 🚀 Erste Schritte

### Voraussetzungen
- Node.js ≥ 20
- Ein [Supabase](https://supabase.com)-Projekt

### Installation

```bash
git clone https://github.com/HarryForSWT/Ton-GPT.git
cd Ton-GPT
npm install
```

### Umgebungsvariablen

Erstelle eine `.env.local` Datei:

```env
NEXT_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-anon-key
SUPABASE_SERVICE_ROLE_KEY=dein-service-role-key
```

> **Hinweis:** Der `SUPABASE_SERVICE_ROLE_KEY` wird für Admin-Funktionen benötigt (Passwort-Reset, Lehrer-Registrierung). Findest du unter Supabase Dashboard → Settings → API → `service_role`.

### Datenbank-Migration

Führe die SQL-Statements aus `supabase/schema.sql` im Supabase SQL-Editor aus. Für bestehende Installationen sind zusätzlich folgende Migrationen nötig:

```sql
-- Phase 7: Verwaltung & Passwort-Reset
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS assigned_teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS password_reset_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own reset requests" ON password_reset_requests
  FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can read own reset requests" ON password_reset_requests
  FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Teachers can read all reset requests" ON password_reset_requests
  FOR SELECT USING ((auth.jwt()->'user_metadata'->>'role') = 'teacher');
CREATE POLICY "Teachers can update reset requests" ON password_reset_requests
  FOR UPDATE USING ((auth.jwt()->'user_metadata'->>'role') = 'teacher');

CREATE POLICY "Teachers can update student profiles" ON profiles FOR UPDATE USING (
    (auth.jwt()->'user_metadata'->>'role') = 'teacher'
);
```

### Entwicklungsserver starten

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

### Production Build

```bash
npm run build
npm start
```

## 🌐 Deployment

Deployed auf **[Vercel](https://vercel.com)** via GitHub-Integration.
Bei jedem `git push` auf `main` wird automatisch neu deployed.

**Environment Variables** müssen in den Vercel Project Settings konfiguriert werden:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 📁 Projektstruktur

```
src/
├── app/
│   ├── api/
│   │   └── admin/            # Admin-API-Routes (Passwort-Reset, Lehrer-Registrierung)
│   ├── auth/                 # Login, Registrierung, Passwort-Reset
│   ├── student/
│   │   ├── vocab/            # Vokabelliste, Detail, Hinzufügen
│   │   ├── requests/         # Bewertungsanfragen (Liste, Neu, Detail)
│   │   ├── calendar/         # Übungskalender
│   │   └── settings/         # Passwort ändern
│   └── teacher/
│       └── request/          # Anfragen-Dashboard & Bewertung
│                             # + Schülerverwaltung & Admin-Funktionen
├── components/
│   ├── audio/                # AudioControls, AudioRecorder, AudioPlayer,
│   │                         # ToneAnalyser, MandarinTTSPlayer
│   └── ui/                   # ThemeSwitcher
├── lib/
│   ├── admin.ts              # Admin-Funktionen (Schüler, Lehrer, Passwort-Resets)
│   ├── audioAnalysis.ts      # Pitch-Extraktion & Vergleich-Algorithmen
│   ├── db.ts                 # IndexedDB-Wrapper
│   ├── pinyinConverter.ts    # Pinyin Symbol ↔ Nummer Konvertierung
│   ├── requests.ts           # Aussprache-Anfragen & Lehrer-Feedback
│   └── supabase.ts           # Supabase Client Singleton
├── utils/
│   └── supabase/             # Supabase Client, Server, Middleware, Admin
└── locales/
    └── de.ts                 # Deutsche Übersetzungen
```

## 📄 Lizenz

Privates Projekt.
