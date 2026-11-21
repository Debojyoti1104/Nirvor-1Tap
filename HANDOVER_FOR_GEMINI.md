# HANDOVER FOR GEMINI / FUTURE DEVELOPERS

**Project**: Nirvor-1Tap (Northeast Connect — Civic Emergency Assistant for North East India)  
**Location**: `d:\northeast-connect`  
**Git Branch**: `main`  
**Current Date**: November 2026  
**Status**: Production Ready (`npm run build` exits with code `0` cleanly)

---

## 1. Project Background & Requirements Delivered

The project was constructed to provide an emergency operations dashboard for the 8 North Eastern Indian states during seasonal floods, landslides, and earthquakes.

### Delivered Capabilities:
1. **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + lucide-react + Leaflet**.
2. **Anti-"AI Slop" Design System**:
   - Utilitarian civic command center styling.
   - High-contrast palette: `#F8FAFC` background, `#FFFFFF` cards, `#E2E8F0` borders, `#0F172A` ink.
   - Semantic signals: Crimson `#DC2626` (Critical/SOS), Amber `#D97706` (Moderate/Watch), Emerald `#059669` (Safe/Verified).
   - Fonts: `Plus Jakarta Sans` for UI, `JetBrains Mono` for tabular coordinates, metrics, and SMS packets.
3. **8 North East States & 10 Hubs Configured**:
   - Assam (Guwahati, Silchar, Jorhat)
   - Meghalaya (Shillong)
   - Arunachal Pradesh (Itanagar)
   - Manipur (Imphal)
   - Mizoram (Aizawl)
   - Nagaland (Kohima)
   - Tripura (Agartala)
   - Sikkim (Gangtok)
4. **Live Weather & Risk Engine** (`src/lib/riskEngine.ts`):
   - Open-Meteo REST API integration with 5-minute cache.
   - Terrain-weighted heuristic (flood-prone valley vs. landslide-prone mountain vs. mixed).
   - Monsoon-aware fallback profiles when offline.
5. **Interactive Leaflet Map** (`src/components/EmergencyMap.tsx`):
   - Dynamically imported with `ssr: false` to ensure zero `window is not defined` build issues.
   - Clean CartoDB Positron tiles, custom SVG div icons for shelters, hospitals, police, and incidents.
6. **Ultra-Low-Bandwidth SOS Codec** (`src/lib/sosCodec.ts`):
   - Format: `NE1:<HEX>:<lat_4dp>,<lng_4dp>` (under 25 bytes, suitable for SMS/2G networks).
   - High nibble: Incident type (`0x1` Flood, `0x2` Landslide, `0x3` Medical, `0x4` Trapped, `0x5` Roadblock).
   - Low nibble: Headcount bucket (`1`=1, `2`=2-4, `3`=5+) + Medical flag (`+0x8`).
   - Integrated into `SosModal.tsx` with dual tabs: "Send SOS" and "Decode Packet".
7. **Incident Reporter** (`src/components/IncidentReporter.tsx`):
   - Community reporting modal with optional GPS attachment.
8. **Verified Helplines & Survival Checklists**:
   - 26+ emergency helplines for all 8 states with 1-tap `tel:` dialing.
   - Interactive Flood, Landslide, and Earthquake preparation checklists persisted in `localStorage`.
9. **Low-Bandwidth Mode**:
   - Header toggle that hides the Leaflet map and heavy rendering, switching to compact monospace telemetry.

---

## 2. Directory & File Map

```
src/
├── app/
│   ├── api/weather/route.ts  # Server-side proxy for Open-Meteo
│   ├── globals.css           # Tailwind v4 import, font imports, scrollbars
│   ├── icon.svg              # Brand SVG favicon
│   ├── layout.tsx            # Root layout with metadata
│   └── page.tsx              # Main dashboard page
├── components/
│   ├── AlertBar.tsx          # Real-time advisory banner
│   ├── BrandLogo.tsx         # Bespoke SVG logo
│   ├── DisasterChecklist.tsx # Interactive checklists
│   ├── EmergencyMap.tsx      # Dynamic Leaflet map with filters
│   ├── HelplineDirectory.tsx # Emergency contacts table
│   ├── IncidentReporter.tsx  # Incident submission modal
│   ├── SosModal.tsx          # SOS dialer + 2G codec encoder/decoder
│   └── TelemetryStrip.tsx    # 4-column metric strip
├── data/
│   └── neData.ts             # Curated hubs, shelters, helplines, checklists
├── lib/
│   ├── riskEngine.ts         # Weather fetch & risk algorithm
│   └── sosCodec.ts           # 2G SMS packet encoder & decoder
└── types/
    └── index.ts              # Strict TypeScript definitions
```

---

## 3. Build & Verification Commands

PowerShell execution policy in this Windows environment may require bypass. Always run:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
```

To run build:
```powershell
npm run build
```

To run dev server:
```powershell
npm run dev
```

To test the SOS codec with Node:
```powershell
node --experimental-strip-types -e "
import { encodeSosPacket, decodeSosPacket } from './src/lib/sosCodec.ts';
console.log(decodeSosPacket('NE1:1A:26.1445,91.7362'));
"
```

---

## 4. Key Implementation Notes & Gotchas

1. **Tailwind CSS v4**:
   Next.js 16 installed Tailwind v4 (`tailwindcss@4.3.3`, `@tailwindcss/turbopack`).
   Do **NOT** use `@tailwind base; @tailwind components; @tailwind utilities;` in `globals.css` as it throws Turbopack warnings. Use `@import "tailwindcss";`.
2. **Leaflet Dynamic Import**:
   `EmergencyMap.tsx` MUST always be imported dynamically with `ssr: false` in `src/app/page.tsx` because Leaflet accesses `window` and `navigator`.
3. **Zero `localhost` Rule**:
   Do not hardcode `http://localhost:3000` anywhere in the source files. Internal API calls use relative paths (e.g. `/api/weather?...`).
4. **Zero Asset Overhead**:
   Do not add large PNG, JPG, or MP4 files to the repository. The repo size remains ultra-lean (<1 MB excluding `node_modules`).

---

## 5. Potential Future Enhancements

If the user requests additional features, here are natural directions:
- **Supabase Integration**: Described in `README.md` for multi-user incident synchronization and realtime websocket feeds.
- **Web Push Notifications**: Service Worker integration for high-risk flood alerts.
- **Offline PWA**: Registering a Service Worker and `manifest.json` for offline survival checklist usage during total network cutoffs.
- **Languages / Localization**: Assamese, Bengali, Bodo, Meitei, and Hindi translations for local community reach.
