<<<<<<< HEAD
# LorryCare — React Full Stack App

Same backend as before (Node.js, zero dependencies, built-in `node:sqlite`), now paired with a proper **React** frontend built with Vite.

## Run it locally

You'll need [Node.js 18+](https://nodejs.org) installed (Node 22+ for the `--env-file` flag used below). The frontend needs a real `npm install` (React, React Router, Vite) — run that step on your own machine where npm has normal internet access.

**0. Configure the backend's real API credentials** (one-time):
```bash
cd backend
cp .env.example .env
```
Edit `.env` and fill in:
```
TRACK_API_USERNAME=your_traqo_username
TRACK_API_PASSWORD=your_traqo_password
TRACK_API_URL=https://dashboard.traqo.in/api/v1/fastag/fetch_live_locations/
GEOCODE_CONTACT_EMAIL=you@example.com   # optional but recommended by Nominatim's usage policy
```
**`.env` is gitignored — never commit real credentials.** If you ever pasted them somewhere they shouldn't be (chat, a public repo, a screenshot), rotate the password on the Traqo dashboard.

**1. Start the backend** (Terminal 1):
```bash
cd backend
npm start
```
Runs at `http://localhost:4000`. No `npm install` needed — it only uses Node's built-ins. `npm start` automatically loads `.env` if present (`node --env-file-if-exists=.env`).

**2. Install & start the frontend** (Terminal 2):
```bash
cd frontend
npm install
npm run dev
```
Vite will print a local URL, typically `http://localhost:5173`.

**3. Open the app** at the printed URL, register an account (you get 50 free credits), and try searching a vehicle like `KA05AB1234`.

## Configuration

The frontend talks to the backend at `http://localhost:4000/api` by default. To change this (e.g. if you deploy the backend somewhere), copy `.env.example` to `.env` in `frontend/` and set:
```
VITE_API_BASE=https://your-backend-url/api
```

## Project structure

```
backend/                    — unchanged Node.js API (see backend README notes below)
  src/server.js, src/auth, src/tracking, src/payments, src/notifications, src/fleet, src/history, src/common

frontend/
  src/
    main.jsx                — React entry point
    App.jsx                 — routes (React Router) + auth guards
    api/
      client.js             — fetch wrapper for all backend endpoints
      AuthContext.jsx        — auth state (user, login, register, logout) via React Context
    components/
      AppLayout.jsx          — sidebar (desktop) + bottom nav (mobile) shell
      VehicleResultCard.jsx  — shared tracking result card
      AddVehicleModal.jsx    — add-to-fleet modal
      Common.jsx             — Spinner, EmptyState, ErrorBanner, SuccessBanner, StatusBadge
    pages/
      Login.jsx, Register.jsx, Dashboard.jsx, Track.jsx, FastagTrack.jsx, Fleet.jsx, History.jsx, Profile.jsx
    styles.css               — LorryCare design system (navy/light-blue brand)
  vite.config.js
  package.json
```

## What's implemented (same feature set as the design doc)

- **Auth (1.0):** register/login by role, JWT sessions, scrypt password hashing
- **Vehicle / E-Way Bill Search & Tracking (2.0):** deducts credits, calls a **mocked** government API (VAHAN/ULIP/E-Way Bill/FASTag), live-style location + toll + validity
- **FASTag live tracking (real integration):** calls the real Traqo `fetch_live_locations` API and reverse-geocodes each ping's lat/lon into city/state/pincode — see below
- **Payment & Credit Management (4.0):** credit packages, mocked payment gateway, transaction history
- **Notification & Communication (5.0):** WhatsApp-style alerts with automatic email fallback on failure
- **Fleet Management (6.0):** add/remove vehicles, assign drivers, update status
- **History (6.0):** search, notification, and payment history + summary stats

External systems for the *original* mocked flow (government databases, payment gateway, WhatsApp) live in `backend/src/common/external.js` — swap in real API calls when you're ready for production. The **FASTag flow is real**, not mocked (see below).

## FASTag live-location integration (Traqo)

**What it does:** `POST /api/fastag/live-location` with `{ "vehicle_number": "..." }` calls Traqo's real `fetch_live_locations` endpoint (HTTP Basic Auth from your `.env`), then reverse-geocodes each returned `lat`/`lon` via OpenStreetMap Nominatim into `city`, `state`, and `pincode`, persists the enriched pings to the `fastag_pings` table, and returns them. `GET /api/fastag/history/:vehicle_no` returns previously stored pings for a vehicle without re-fetching from Traqo.

**Files:**
- `backend/src/common/traqo.js` — Traqo API client (Basic Auth, error handling)
- `backend/src/common/geocode.js` — Nominatim reverse-geocoding client, with an in-memory cache and a built-in rate limiter (Nominatim's usage policy caps free usage at ~1 request/second)
- `backend/src/fastag/service.js` — orchestrates fetch → geocode → persist
- `frontend/src/pages/FastagTrack.jsx` — "FASTag" tab in the app; enter a vehicle number, see each toll-plaza ping with its resolved address

**Important notes:**
- **Credentials go in `backend/.env` only** (see step 0 above). The code never hardcodes them.
- **Geocoding can legitimately return "address unavailable"** for a ping — this happens if Nominatim has no OSM data for that exact point, or if the geocoding request itself fails. The API still returns the raw toll-plaza name and coordinates in that case (`geocode_source: "error"`); it never drops the whole tracking response over a geocoding failure.
- **Nominatim is a free, shared service** — for anything beyond light personal/testing use, read their [usage policy](https://operations.osmfoundation.org/policies/nominatim/) and consider self-hosting Nominatim or using a paid geocoder (set `NOMINATIM_URL` in `.env` to point at your own instance if so — the code already supports overriding it).
- **This part was tested against mocked stand-ins for Traqo and Nominatim** (this sandbox's network egress couldn't reach either real domain to test live) — the request/response shapes, auth header construction, and error handling all match the documented/observed API shapes exactly, but you should do one real test call after setting up `.env` to confirm your specific account works as expected.

## Building for production

```bash
cd frontend
npm run build
```
This outputs static files to `frontend/dist/` which you can deploy to any static host (Vercel, Netlify, S3, etc.) — just make sure `VITE_API_BASE` points at wherever you deploy the backend.
=======
# FASTag_tracker
tracking with the help of FASTAG 
>>>>>>> b41aca8303dada71958381f5bbadf5f80095a455
