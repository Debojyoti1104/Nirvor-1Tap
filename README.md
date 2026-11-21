# Nirvor-1Tap

**Northeast Connect — Community Emergency Assistant for North East India (PS05)**

> A civic emergency platform for the 8 North Eastern states — built to keep working when the network, the power, or the road does not.

**Live:** `https://<your-vercel-url>.vercel.app` *(replace after deploy)*

---

## Why this fits PS05

The problem statement asks for three things. Most dashboards only do the first.

| Requirement | How Nirvor-1Tap answers it |
| --- | --- |
| **Access** essential emergency information | Offline-first PWA, 30+ verified helplines, 21 districts/hubs, flood/landslide/earthquake checklists |
| **Stay informed** | Live Open-Meteo weather, terrain-weighted risk index, advisory bar, low-bandwidth mode |
| **Connect with relevant assistance** | Community incident reports with responder verification, plus a two-sided relief board (needs ↔ offers) |

The differentiator is the failure case: **when the internet dies, the app still opens, the SOS still generates, and queued reports sync when the network returns.**

---

## Core capabilities

### 1. Offline-first PWA
- Installable (`manifest.ts` + service worker), app-shell + route-chunk precache.
- Map tiles are cached as you browse, so the last viewed area works offline.
- Reports, relief posts and verifications are queued in `localStorage` and flushed automatically on reconnect.
- An explicit offline banner shows the queue count — no silent data loss.

### 2. Ultra-low-bandwidth SOS (`src/lib/sosCodec.ts`)
- `NE1:<HEX>:<lat_4dp>,<lng_4dp>` — under 25 bytes, SMS/2G safe.
- High nibble = incident type (flood, landslide, medical, trapped, roadblock).
- Low nibble = headcount bucket + medical flag.
- **Offline rescue QR** generated on-device: a rescue team can scan it with zero connectivity.
- One-tap SMS, WhatsApp share card, packet copy, and a decoder for volunteers.

### 3. Supabase-backed community layer
- `POST /api/incidents` and `POST /api/relief` persist through the server (service-role key never reaches the browser).
- Polling + `BroadcastChannel` keeps multiple phones/tabs in sync within seconds.
- If Supabase is not configured, an in-memory store keeps the app fully demo-able.

### 4. Relief board (the "connect" loop)
- **Need help** and **Offer help** in one board.
- Open → claimed → fulfilled lifecycle, categories for rescue, water, medicine, shelter and missing persons.
- Designed to be usable without an account.

### 5. Responder mode
- Toggle in the action bar reveals **Verify** on community reports.
- Simulated seed incidents are tagged with a visible **Simulated scenario** badge; real reports you submit are not.

### 6. Triage-first entry
- Three large actions before the dashboard: **I am in danger · I need help · I want to help**.
- Because panicked users do not browse tabs.

### 7. Multilingual + accessible
- English, Assamese, Bengali, Hindi via a custom language menu (machine translation).
- Emergency/A11y mode: larger type and higher contrast; reduced-motion respected.

### 8. Map with real context
- Leaflet + OpenStreetMap, OpenTopoMap terrain and Esri satellite base layers — all free, no API key.
- Shelters, hospitals, police, incidents, and hub markers.

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Leaflet · Supabase REST · lucide-react · qrcode

---

## 1. Run locally

```bash
npm install
npm run dev
```

Production check (needed for the service worker):

```bash
npm run build
npm start
```

> The service worker only registers in a production build. Test offline with `npm run build && npm start`.

---

## 2. Supabase setup (5 minutes, free, no credit card)

1. Go to **https://supabase.com** → sign in → **New project**.
   - Name: `nirvor-1tap`
   - Region: **Mumbai / ap-south-1** (closest to NE India)
   - Set a database password and save it.
2. Wait for the project to finish provisioning (~2 min).
3. Open **SQL Editor** → **New query** → paste the schema below → **Run**.

```sql
-- Tables
create table if not exists public.incidents (
  id text primary key,
  category text not null,
  severity text not null,
  hub_id text not null,
  state text not null,
  description text not null,
  lat double precision,
  lng double precision,
  verified boolean not null default false,
  reporter_type text not null default 'community',
  created_at timestamptz not null default now()
);

create table if not exists public.relief_posts (
  id text primary key,
  kind text not null check (kind in ('need', 'offer')),
  category text not null,
  description text not null,
  name text not null default 'Anonymous',
  contact text not null default '',
  state text not null,
  hub_id text not null,
  lat double precision,
  lng double precision,
  status text not null default 'open' check (status in ('open', 'claimed', 'fulfilled')),
  claimed_by text,
  created_at timestamptz not null default now()
);

-- Server-only access: the anon key cannot read or write these tables.
alter table public.incidents enable row level security;
alter table public.relief_posts enable row level security;
```

4. Copy two values from **Project Settings → API** (or the **Connect** screen):
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`)
   - the **secret** key:
     - new projects: `sb_secret_...` (**SECRET_KEY**)
     - older projects: the **service_role** JWT (`eyJ...`)
   - Do **not** use the publishable / anon key — RLS is enabled with no client policies.
5. Create `.env.local` in the project root:

```env
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your-secret-key
```

   If your project still uses legacy keys, this also works:

```env
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
```

6. Restart the server and open `/api/incidents`. You should see `"database": true`.
   The footer will change from *Session sync* to **Supabase sync active**.

> **Security note:** both key names are server-only because all writes go through `/api/*` route handlers. Never rename them to `NEXT_PUBLIC_*`.

---

## 3. Deploy (Vercel, free, no credit card)

1. Push this repo to GitHub (public, single `main` branch).
2. Go to **https://vercel.com/new** → **Import Git Repository** → select `nirvor-1tap`.
3. Framework preset: **Next.js** (auto-detected). Leave build settings as-is.
4. Expand **Environment Variables** and add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. **Deploy**. Copy the production URL into the top of this README.

If you add the env vars after the first deploy: **Settings → Environment Variables → add → Deployments → Redeploy**.

---

## 4. Demo script (3 minutes)

1. **Triage** — open on *"What do you need right now?"* → tap **I am in danger**.
2. **SOS** — show the `NE1:` packet and the **offline rescue QR**. Turn Wi-Fi off: the app still loads from cache and the QR still generates.
3. **Connect** — on a second device, open **Relief Board** → post a need. It appears on device one in ~5 seconds.
4. **Responder** — toggle **Responder** → verify the community report → it syncs back.
5. **Language** — switch to **অসমীয়া** to show community reach.
6. **Map** — switch **Street → Terrain → Satellite**, or open a district hub like Barpeta.

---

## Data honesty

- Seeded incidents are labelled **Simulated scenario**. Submitted reports are real rows.
- Weather is live Open-Meteo; when unreachable the risk engine uses a clearly marked seasonal fallback.
- District coordinates/elevations are indicative for demonstration and should be replaced with official district data before real deployment.

---

## Emergency numbers

**112** national emergency · **108** ambulance · **1070 / 1077** disaster management · **100** police · **101** fire
