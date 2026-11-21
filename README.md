# Northeast Connect

**Live Production URL:** `https://your-production-url.vercel.app` *(Replace with deployed domain)*

> **Northeast Connect** is a high-trust, utilitarian **Civic Emergency Command Center** engineered specifically for the 8 North Eastern states of India (Assam, Meghalaya, Arunachal Pradesh, Manipur, Mizoram, Nagaland, Tripura, and Sikkim). Built for rapid disaster response during recurring Brahmaputra/Barak valley floods, Himalayan landslides, and high-risk seismic events.

---

## Design System & Anti-"AI Slop" Philosophy

- **Civic Telemetry Grid**: Direct operational console load with zero landing page fluff or marketing banners.
- **Color Discipline**: High-contrast surface (`#F8FAFC`), pure white container cards (`#FFFFFF`), hairline borders (`#E2E8F0`), and semantic indicators only:
  - Signal Crimson (`#DC2626`) — SOS / Critical Hazard
  - Warning Amber (`#D97706`) — Watch / Landslide Advisory
  - Verified Emerald (`#059669`) — Verified Active Relief Shelters
  - Deep Slate (`#0F172A`) — Primary ink
- **Typography**: `Plus Jakarta Sans` for clean UI hierarchy and `JetBrains Mono` for tabular coordinates, rainfall figures in `mm`, and 2G hex packets.
- **Zero Heavy Assets**: Custom inline SVG beacon brand logo (`src/components/BrandLogo.tsx`) and tab favicon (`src/app/icon.svg`). Total source payload < 200 KB.

---

## Core Capabilities

### 1. Live Meteorological & Risk Computation Engine (`src/lib/riskEngine.ts`)
- Queries Open-Meteo REST API (`https://api.open-meteo.com/v1/forecast`) with zero API keys required.
- Automatically calculates a deterministic **Flood & Landslide Risk Index (0–100)** factoring in terrain profile:
  - `valley_flood`: Brahmaputra and Barak river plains (Guwahati, Silchar, Jorhat)
  - `hilly_landslide`: Mountainous terrain (Shillong, Itanagar, Kohima, Aizawl, Gangtok)
  - `mixed`: High elevation-drop transition zones (Imphal, Agartala)
- Graceful offline fallback with seasonal monsoon rainfall profiles when network connections degrade.

### 2. Interactive Disaster & Relief Map (`src/components/EmergencyMap.tsx`)
- Client-side dynamically loaded Leaflet map (`ssr: false`) with CartoDB Positron lightweight tile layers.
- Verified pins for Shelters (with occupancy stats), Hospitals, Police Stations, and Community Incidents.
- Direct external links to Google Maps navigation (`https://www.google.com/maps/dir/...`) and 1-tap phone dialers.

### 3. Ultra-Low-Bandwidth SOS Packet Codec (`src/lib/sosCodec.ts`)
- **2G / SMS Disaster Optimization**: Encodes emergency coordinates and critical triage intent into a compact single-byte header packet under 25 bytes:
  ```
  Format:  NE1:<2-char-HEX>:<lat_4dp>,<lng_4dp>
  Example: NE1:1A:26.1445,91.7362
  ```
  - **High Nibble (bits 4–7)**: Incident type (`0x1` Flood, `0x2` Landslide, `0x3` Medical, `0x4` Trapped, `0x5` Roadblock)
  - **Low Nibble (bits 0–3)**: Headcount (`1` = 1, `2` = 2–4, `3` = 5+) + Medical assistance flag (`+0x8`)
- In-modal **"Send SOS"** with 1-tap WhatsApp broadcast, SMS launcher (`sms:?body=...`), and clipboard copier.
- In-modal **"Decode Packet"** decoder for rescue volunteers and SDR operators to paste and inspect raw SMS packets with direct Google Maps pin generation.

### 4. Community Incident Reporting (`src/components/IncidentReporter.tsx`)
- Immediate community triage reporting with GPS pin attachment.
- Persisted locally with instant updates on the live operational map and incident feed.

### 5. Verified Helpline Directory & Disaster Survival Checklists
- Curated emergency contact roster for all 8 State Disaster Management Authorities (ASDMA, Meghalaya SDMA, etc.), Police, Fire, and District Control Rooms.
- Step-by-step interactive survival checklists for Floods, Landslides, and Earthquakes with local progress persistence.

### 6. Low-Bandwidth Mode
- One-click toggle in the operational header to strip map tiles and high-density rendering, reducing bandwidth consumption to bare telemetry metrics.

---

## Architecture Overview

```
d:/northeast-connect/
├── src/
│   ├── app/
│   │   ├── api/weather/route.ts  # Next.js API proxy for Open-Meteo
│   │   ├── globals.css           # Tailwind v4 import + custom scrollbars
│   │   ├── icon.svg              # Custom brand favicon mark
│   │   ├── layout.tsx            # Root layout with civic metadata
│   │   └── page.tsx              # Central operational command dashboard
│   ├── components/
│   │   ├── AlertBar.tsx          # Real-time advisory notification bar
│   │   ├── BrandLogo.tsx         # Bespoke SVG beacon/contour brand mark
│   │   ├── DisasterChecklist.tsx # Flood, landslide & quake checklists
│   │   ├── EmergencyMap.tsx      # Dynamic Leaflet/OSM map component
│   │   ├── HelplineDirectory.tsx # Filterable 8-state emergency numbers
│   │   ├── IncidentReporter.tsx  # Community incident intake modal
│   │   ├── SosModal.tsx          # Dual-tab SOS broadcaster & SMS decoder
│   │   └── TelemetryStrip.tsx    # 4-column metric bar with tabular figures
│   ├── data/
│   │   └── neData.ts             # 8 NE states, 10 hubs, facilities, helplines
│   ├── lib/
│   │   ├── riskEngine.ts         # Weather data fetch & terrain risk algorithm
│   │   └── sosCodec.ts           # Pure TypeScript 2G SOS encoder/decoder
│   └── types/
│       └── index.ts              # Strict TypeScript definitions
├── public/                       # Static public folder
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind styling config
├── tsconfig.json                 # TypeScript strict compiler config
└── package.json                  # Dependencies & scripts
```

---

## Local Development & Build Verification

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run production build check
npm run build
```

---

## Optional: Supabase Integration Steps

The application runs autonomously out of the box with `localStorage` and client state for zero-cost operation. If multi-device cross-community incident synchronization and official SDR verification are desired, follow these steps to plug in Supabase:

### Step 1: Create Supabase Project
1. Navigate to [database.new](https://database.new) and create a new project.
2. Under **Project Settings > API**, copy the `Project URL` and `anon public` key.

### Step 2: Environment Variables
Create `.env.local` in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 3: Run Database Migrations
Execute the following SQL in the **Supabase SQL Editor**:
```sql
-- Enable PostGIS for geospatial queries if desired
CREATE EXTENSION IF NOT EXISTS postgis;

-- Community Incident Reports
CREATE TABLE public.incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('Flood', 'Landslide', 'Roadblock', 'Power Outage', 'Earthquake', 'Medical Emergency')),
  severity TEXT NOT NULL CHECK (severity IN ('Low', 'Moderate', 'High', 'Critical')),
  hub_id TEXT NOT NULL,
  state TEXT NOT NULL,
  description TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  verified BOOLEAN DEFAULT false,
  reporter_type TEXT DEFAULT 'community',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public can view incidents"
  ON public.incidents FOR SELECT
  USING (true);

-- Allow authenticated or anonymous insert
CREATE POLICY "Anyone can report an incident"
  ON public.incidents FOR INSERT
  WITH CHECK (true);

-- Enable Supabase Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
```

### Step 4: Install Supabase Client
```bash
npm install @supabase/supabase-js
```

### Step 5: Initialize Client Helper
Create `src/lib/supabaseClient.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
```

---

## Deployment to Vercel

1. Push your changes to branch `main` on GitHub:
   ```bash
   git add -A
   git commit -m "feat: complete Northeast Connect emergency platform"
   git push origin main
   ```
2. Import the repository in [Vercel](https://vercel.com/new).
3. Framework Preset: **Next.js**.
4. Leave all environment variables empty (or add Supabase credentials if configured).
5. Click **Deploy**. The application builds cleanly with `npm run build`.
