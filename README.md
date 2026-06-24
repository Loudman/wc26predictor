# ⚽ WC26 Predictor

A real-time World Cup 2026 score prediction game for friend groups. Players predict the result of every match, earn points based on accuracy, and compete on a live leaderboard.

---

## Features

- **Live match data** — fixtures, scores and results pulled from [football-data.org](https://www.football-data.org)
- **Score predictions** — predict the exact score for any upcoming match; predictions lock once a match kicks off
- **Proximity scoring** — points awarded based on how close your prediction is to the real result
- **Group predictions** — see what everyone else predicted, per match
- **Leaderboard** — real-time ranking across all finished matches
- **Two auth methods** — Google Sign-In or email + password
- **Profile dropdown** — change your display name, view all registered players

---

## Scoring

| Points | Condition |
|--------|-----------|
| **5** | Exact score (e.g. predicted 2-1, actual 2-1) |
| **4** | Correct outcome, 1 goal off in total (e.g. predicted 2-1, actual 3-1) |
| **3** | Correct outcome, 2 goals off |
| **2** | Correct outcome, 3+ goals off |
| **0** | Wrong outcome |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, React Router |
| Backend | Node.js 22, Express, TypeScript |
| Database | [Turso](https://turso.tech) (libSQL / SQLite) — local file in dev, cloud in production |
| Auth | Google OAuth 2.0 (via `@react-oauth/google`) + email/password (bcrypt) |
| Data API | [football-data.org](https://www.football-data.org) free tier |
| Deployment | [Vercel](https://vercel.com) (frontend + backend as serverless functions) |

---

## Project structure

```
wc26-game/
├── backend/                  Express API
│   ├── src/
│   │   ├── index.ts          App entry point
│   │   ├── db.ts             Turso/libSQL client + schema
│   │   ├── middleware/
│   │   │   └── auth.ts       JWT middleware
│   │   ├── routes/
│   │   │   ├── auth.ts       Google OAuth, email login/register, name update, user list
│   │   │   ├── matches.ts    World Cup fixtures proxy (2-min cache)
│   │   │   ├── predictions.ts CRUD predictions per user
│   │   │   └── leaderboard.ts Points calculation + ranking
│   │   └── services/
│   │       └── footballData.ts football-data.org API client
│   ├── .env.example
│   ├── vercel.json
│   └── package.json
│
└── frontend/                 React SPA
    ├── src/
    │   ├── App.tsx            Auth context + routing
    │   ├── api/client.ts      Axios API client
    │   ├── types/index.ts     Shared TypeScript types
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   ├── MatchesPage.tsx
    │   │   └── LeaderboardPage.tsx
    │   └── components/
    │       ├── Header.tsx      Nav + profile dropdown + modals
    │       ├── MatchCard.tsx   Match tile with prediction badge
    │       └── PredictionModal.tsx  Score input + group predictions
    ├── .env.example
    ├── vercel.json
    └── package.json
```

---

## Local development

### Prerequisites

- Node.js **v22+** (uses the built-in `node:sqlite` for local dev via `@libsql/client` file mode)
- `nvm` recommended — a `.nvmrc` is provided in `backend/`

### 1. Clone and install

```bash
git clone https://github.com/your-username/wc26-game.git
cd wc26-game

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment variables

**Backend** — copy and fill in `backend/.env`:
```bash
cp backend/.env.example backend/.env
```

```env
PORT=3001
GOOGLE_CLIENT_ID=          # from Google Cloud Console (optional for local dev)
JWT_SECRET=                # generate: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
FOOTBALL_DATA_API_KEY=     # free at football-data.org/client/register
TURSO_DATABASE_URL=file:./wc26.db   # local SQLite file, no Turso account needed
TURSO_AUTH_TOKEN=          # leave empty for local file mode
FRONTEND_URL=http://localhost:5173
```

**Frontend** — copy and fill in `frontend/.env`:
```bash
cp frontend/.env.example frontend/.env
```

```env
VITE_GOOGLE_CLIENT_ID=     # same as GOOGLE_CLIENT_ID above (optional for local dev)
# VITE_API_URL=            # leave blank — Vite proxy handles /api in dev
```

### 3. Start both servers

```bash
# Terminal 1
cd backend
nvm use        # switches to Node 22 via .nvmrc
npm run dev

# Terminal 2
cd frontend
npm run dev
```

App is available at **http://localhost:5173**

---

## API keys

### football-data.org (required)
1. Register free at [football-data.org/client/register](https://www.football-data.org/client/register)
2. Copy the token from your confirmation email
3. Add it to `backend/.env` as `FOOTBALL_DATA_API_KEY`

### Google OAuth (optional for local dev)
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → **APIs & Services** → **OAuth consent screen** → External → fill in app name + email
3. **Credentials** → **+ Create Credentials** → **OAuth 2.0 Client ID** → Web application
4. Add `http://localhost:5173` to **Authorized JavaScript origins** (add your Vercel URL when deploying)
5. Copy the Client ID into both `backend/.env` (`GOOGLE_CLIENT_ID`) and `frontend/.env` (`VITE_GOOGLE_CLIENT_ID`)

---

## Deployment (Vercel + Turso)

### 1. Create a Turso database

```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup
turso db create wc26-game
turso db show wc26-game --url     # copy libsql://... URL
turso db tokens create wc26-game  # copy auth token
```

Or create it at [app.turso.tech](https://app.turso.tech) without the CLI.

### 2. Deploy the backend

1. [vercel.com](https://vercel.com) → **New Project** → import your repo → set **Root Directory** to `backend`
2. Add environment variables:

| Key | Value |
|-----|-------|
| `FOOTBALL_DATA_API_KEY` | your key |
| `GOOGLE_CLIENT_ID` | your client ID |
| `JWT_SECRET` | a long random string |
| `TURSO_DATABASE_URL` | `libsql://wc26-game-xxx.turso.io` |
| `TURSO_AUTH_TOKEN` | your Turso token |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` |

3. Deploy and copy the generated URL (e.g. `https://wc26-backend.vercel.app`)

### 3. Deploy the frontend

1. **New Project** → same repo → **Root Directory**: `frontend`
2. Add environment variables:

| Key | Value |
|-----|-------|
| `VITE_GOOGLE_CLIENT_ID` | your client ID |
| `VITE_API_URL` | `https://wc26-backend.vercel.app/api` |

3. Deploy

### 4. Update Google OAuth origins

Add your Vercel frontend URL to **Authorized JavaScript origins** in your Google Cloud OAuth client.

---

## API endpoints

All routes prefixed with `/api`. Auth routes marked with 🔒 require a `Bearer` JWT token.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/google` | Sign in with Google credential |
| `POST` | `/auth/register` | Register with email + password |
| `POST` | `/auth/login` | Login with email + password |
| `GET` | `/auth/me` 🔒 | Get current user |
| `PUT` | `/auth/name` 🔒 | Update display name |
| `GET` | `/auth/users` 🔒 | List all registered users |
| `GET` | `/matches` 🔒 | All WC2026 fixtures + results (2-min cache) |
| `GET` | `/predictions` 🔒 | My predictions |
| `GET` | `/predictions/all` 🔒 | All users' predictions |
| `PUT` | `/predictions/:matchId` 🔒 | Save or update a prediction |
| `GET` | `/leaderboard` 🔒 | Ranked standings |

---

## License

MIT
