# EternalOS

> Your corner of the internet.

A personal desktop in the browser with classic Mac OS aesthetics. No algorithms. No feeds. Just you.

## What is EternalOS?

EternalOS gives users a personal desktop environment inspired by Mac OS 8. Users can:

- **Place files on a desktop** — drag, drop, and organize icons freely
- **Upload images and text files** — stored securely in the cloud
- **Create folders** — nested organization just like a real desktop
- **Share a public link** — visitors can browse at `/@username` (read-only)
- **Chat with a Desk Assistant** — powered by Llama 3.3, aware of your desktop contents
- **Customize wallpapers** — 13 retro patterns to choose from

No likes, no comments, no metrics. A digital sanctuary for depth.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Cloudflare Edge                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │   Pages     │    │   Worker    │    │    Durable Objects      │ │
│  │  (Frontend) │───▶│  (API)      │───▶│  (UserDesktop per user) │ │
│  └─────────────┘    └──────┬──────┘    └─────────────────────────┘ │
│                            │                                        │
│            ┌───────────────┼───────────────┐                       │
│            ▼               ▼               ▼                       │
│     ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│     │    KV    │    │    R2    │    │ Workers  │                  │
│     │(Sessions,│    │ (Files)  │    │   AI     │                  │
│     │ Usernames│    │          │    │(Llama3.3)│                  │
│     │ Cache)   │    │          │    │          │                  │
│     └──────────┘    └──────────┘    └──────────┘                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Cloudflare Services Used

| Service | Purpose |
|---------|---------|
| **Pages** | Hosts the React frontend (static assets) |
| **Workers** | API server handling auth, desktop operations, file uploads |
| **Durable Objects** | Per-user state (UserDesktop) with transactional storage |
| **KV** | Auth sessions, username lookups, public desktop cache |
| **R2** | File storage (images, text files) — zero egress fees |
| **Workers AI** | Desk Assistant powered by Llama 3.3 70B |

### Frontend Stack

- **React 18** with TypeScript
- **Vite** for builds
- **Zustand** for state management
- **React Router** for navigation
- **CSS Modules** for styling (no Tailwind—pixel-perfect retro CSS)

### API Endpoints

```
POST   /api/auth/signup     Create account
POST   /api/auth/login      Log in, receive JWT
POST   /api/auth/logout     Invalidate session

GET    /api/desktop         Fetch user's desktop items
POST   /api/desktop/items   Create item (folder, text, link)
PATCH  /api/desktop/items   Update items (position, name, visibility)
DELETE /api/desktop/items/:id  Delete item

POST   /api/upload          Upload file to R2
GET    /api/files/:uid/:itemId/:filename  Serve file

GET    /api/visit/:username Get public desktop snapshot
POST   /api/assistant       Chat with Desk Assistant (Llama 3.3)
```

## Project Structure

```
eternalos/
├── packages/
│   ├── frontend/           # React app
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── desktop/     # Desktop, UploadProgress
│   │   │   │   ├── icons/       # DesktopIcon, Trash, PixelIcons
│   │   │   │   ├── menubar/     # MenuBar, VisitorMenuBar
│   │   │   │   ├── viewers/     # ImageViewer, TextViewer, GetInfo, WallpaperPicker
│   │   │   │   ├── window/      # Window, WindowManager, FolderView
│   │   │   │   ├── assistant/   # DeskAssistant
│   │   │   │   └── ui/          # LoadingOverlay, AlertDialog
│   │   │   ├── hooks/           # useDocumentMeta, useDesktopSync
│   │   │   ├── pages/           # LandingPage, LoginPage, SignupPage, VisitorPage
│   │   │   ├── services/        # api.ts (Worker client)
│   │   │   ├── stores/          # authStore, desktopStore, windowStore, alertStore
│   │   │   ├── styles/          # global.css, wallpapers.css
│   │   │   └── types/           # TypeScript interfaces
│   │   └── index.html
│   │
│   └── worker/             # Cloudflare Worker
│       ├── src/
│       │   ├── index.ts         # Entry point, router
│       │   ├── routes/          # auth.ts, desktop.ts, files.ts, assistant.ts
│       │   ├── durable-objects/ # UserDesktop.ts
│       │   ├── middleware/      # auth.ts (JWT validation)
│       │   ├── utils/           # jwt.ts, password.ts
│       │   └── types.ts
│       └── wrangler.toml
│
├── package.json            # Monorepo root (workspaces)
└── README.md
```

## Running Locally

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/eternalos.git
cd eternalos

# Install dependencies
npm install

# Set up environment variables
cp packages/frontend/.env.example packages/frontend/.env
# Edit .env with your API URL (or leave blank for demo mode)
```

### Development

```bash
# Start frontend dev server (runs on http://localhost:5173)
npm run dev --workspace=packages/frontend

# In another terminal, start Worker with Miniflare (runs on http://localhost:8787)
npm run dev --workspace=packages/worker
```

### Demo Mode

The frontend can run without a backend in "demo mode":

- Auth is simulated with localStorage
- Desktop items are persisted locally
- No uploads or visitor pages

To use demo mode, leave `VITE_API_URL` unset in `.env`.

### Building

```bash
# Build frontend for production
npm run build --workspace=packages/frontend

# Typecheck worker
npm run typecheck --workspace=packages/worker
```

## Deploying to Cloudflare

### 1. Configure Wrangler

Edit `packages/worker/wrangler.toml` with your account details:

```toml
name = "eternalos-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
JWT_SECRET = "your-secret-here"

[[kv_namespaces]]
binding = "AUTH_KV"
id = "your-kv-namespace-id"

[[kv_namespaces]]
binding = "DESKTOP_KV"
id = "your-desktop-kv-id"

[[r2_buckets]]
binding = "ETERNALOS_FILES"
bucket_name = "eternalos-files"

[[durable_objects.bindings]]
name = "USER_DESKTOP"
class_name = "UserDesktop"

[[migrations]]
tag = "v1"
new_classes = ["UserDesktop"]

[ai]
binding = "AI"
```

### 2. Create Cloudflare Resources

```bash
# Create KV namespaces
wrangler kv namespace create AUTH_KV
wrangler kv namespace create DESKTOP_KV

# Create R2 bucket
wrangler r2 bucket create eternalos-files
```

### 3. Deploy Worker

```bash
cd packages/worker
wrangler deploy
```

### 4. Deploy Frontend to Pages

Connect your Git repository to Cloudflare Pages:

- **Build command:** `npm run build --workspace=packages/frontend`
- **Build output directory:** `packages/frontend/dist`
- **Environment variable:** `VITE_API_URL=https://eternalos-api.your-subdomain.workers.dev`

Or deploy manually:

```bash
cd packages/frontend
npm run build
wrangler pages deploy dist --project-name=eternalos
```

## Design Philosophy

EternalOS is intentionally minimal:

1. **No social features** — No likes, comments, followers, or feeds
2. **No metrics** — No view counts, no analytics dashboards for users
3. **Visitors, not users** — Public desktops are browsed anonymously
4. **Place, don't post** — Files exist in space, not in time
5. **Quiet by design** — A digital sanctuary, not another attention marketplace

The aesthetic is pixel-perfect Mac OS 8:

- VT323 monospace font
- 1px black borders with inner bevels
- Gray (#C0C0C0) system background
- Striped title bars
- 32×32 pixel art icons

## Security Notes

- **JWT auth** using Web Crypto API (HMAC-SHA256)
- **PBKDF2 password hashing** (Workers-native, no Node.js dependencies)
- **R2 access control** — files are served only to owners or if item is marked public
- **Durable Objects** provide strongly consistent per-user state
- **No client-side secrets** — JWT_SECRET stays in Workers environment

## License

MIT

---

Built with care on Cloudflare.
