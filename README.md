# EternalOS

> Your corner of the internet.

A personal desktop in the browser with classic Mac OS aesthetics. No algorithms. No feeds. No likes. Just you.

**[Try the Demo](https://eternalos.app)** | **[Create Your Desktop](https://eternalos.app/signup)**

---

## What is EternalOS?

EternalOS is an anti-social network. Instead of a profile page with posts, you get a personal desktop — a space you curate, not a feed you scroll.

### Place, don't post
Drag files, images, and folders onto your desktop. Arrange them however you like. No timeline, no algorithm deciding what goes where.

### Visitors, not followers
Share your unique link (`/@username`) with anyone. They can explore your desktop, open folders, view images — no account required. No follower counts, no engagement metrics.

### Quiet by design
No likes. No comments. No notifications. A digital sanctuary for people who want depth over dopamine.

---

## Features

### Desktop Customization
- **Custom themes** — Mac OS 8, System 7, Mac OS 9, or NeXT (dark mode)
- **Accent colors** — Pick any color for title bars and selections
- **Desktop colors** — Change the background from platinum to any color
- **Wallpaper patterns** — 13+ retro patterns to choose from
- **Custom icons** — 30+ built-in icons or upload your own (32×32 PNG)
- **Custom CSS** — Power users can write CSS to fully customize their desktop

### Desktop Items
- **Folders** — Nest and organize just like a real desktop
- **Text files** — Write notes, README files, or anything text
- **Images** — PNG, JPG, GIF with thumbnail previews
- **Videos** — MP4 playback with controls
- **Audio** — MP3 playback with visualizations
- **PDFs** — Document viewing
- **Links** — Bookmarks that open in new tabs

### Widgets
- **Sticky Notes** — Pastel-colored notes visible to visitors
- **Guestbook** — Visitors can leave messages (no account needed)
- **Music Player** — Playlist widget with MP3 support
- **Pixel Canvas** — 16×16 pixel art creator
- **Link Board** — Grid of bookmarks with favicons

### AI Assistant
A retro "Desk Assistant" powered by Llama 3.3 that can:
- Answer questions about your desktop contents
- Apply customizations ("make my desktop feel like a rainy day")
- Create widgets and change icons
- Write custom CSS for you

### Visitor Mode
When someone visits `/@yourusername`:
- They see only your public items
- They can open folders, view images, play videos
- They can sign your guestbook (if you have one)
- No account required — pure browsing

---

## Quick Start

1. **Sign up** at [eternalos.app/signup](https://eternalos.app/signup)
2. **Create a username** — this becomes your unique URL
3. **Place items** — Right-click to create folders, text files, or widgets
4. **Upload files** — Drag images or files onto your desktop
5. **Customize** — Open Preferences (Special menu) or talk to the Desk Assistant
6. **Share** — Give your `/@username` link to friends

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + N` | New folder |
| `Cmd/Ctrl + W` | Close window |
| `Cmd/Ctrl + A` | Select all |
| `Cmd/Ctrl + F` | Find |
| `Cmd/Ctrl + D` | Duplicate |
| `Cmd/Ctrl + Backquote` | Cycle windows |
| `Delete` | Move to trash |
| `Enter` | Rename selected |
| `Escape` | Deselect / Cancel |
| `Arrow keys` | Navigate icons |

---

## Architecture

EternalOS runs entirely on Cloudflare infrastructure:

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

| Service | Purpose |
|---------|---------|
| **Pages** | Hosts the React frontend |
| **Workers** | API server for auth, uploads, and desktop operations |
| **Durable Objects** | Per-user state with transactional storage |
| **KV** | Auth sessions, username lookups, public caching |
| **R2** | File storage with zero egress fees |
| **Workers AI** | Desk Assistant (Llama 3.3) |

---

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Local Setup

```bash
# Clone the repository
git clone https://github.com/your-org/eternalos.git
cd eternalos

# Install dependencies
npm install

# Start frontend (http://localhost:5173)
npm run dev --workspace=packages/frontend

# In another terminal, start worker (http://localhost:8787)
npm run dev --workspace=packages/worker
```

### Demo Mode

Leave `VITE_API_URL` unset to run the frontend without a backend:
- Auth simulated with localStorage
- Desktop items stored locally
- No uploads or visitor pages

### Building

```bash
# Build frontend
npm run build --workspace=packages/frontend

# Typecheck worker
npm run typecheck --workspace=packages/worker
```

### Project Structure

```
eternalos/
├── packages/
│   ├── frontend/           # React + TypeScript + Vite
│   │   ├── src/
│   │   │   ├── components/ # Desktop, Window, MenuBar, Viewers, Widgets
│   │   │   ├── hooks/      # useDocumentMeta, useDesktopSync, useIsMobile
│   │   │   ├── pages/      # Landing, Login, Signup, Visitor
│   │   │   ├── services/   # API client
│   │   │   ├── stores/     # Zustand (auth, desktop, window, appearance)
│   │   │   ├── styles/     # Global CSS, wallpapers
│   │   │   └── types/      # TypeScript interfaces
│   │   └── index.html
│   │
│   └── worker/             # Cloudflare Worker
│       ├── src/
│       │   ├── index.ts         # Entry point, router
│       │   ├── routes/          # auth, desktop, files, assistant, ogImage
│       │   ├── durable-objects/ # UserDesktop
│       │   ├── middleware/      # JWT validation, rate limiting
│       │   └── utils/           # jwt, password, helpers
│       └── wrangler.toml
│
└── package.json            # Monorepo root
```

---

## Deploying

### Cloudflare Resources

```bash
# Create KV namespaces
wrangler kv namespace create AUTH_KV
wrangler kv namespace create DESKTOP_KV

# Create R2 bucket
wrangler r2 bucket create eternalos-files
```

### Worker Deployment

```bash
cd packages/worker

# Set JWT secret
wrangler secret put JWT_SECRET

# Deploy
wrangler deploy
```

### Frontend Deployment

Connect to Cloudflare Pages with:
- **Build command:** `npm run build --workspace=packages/frontend`
- **Output directory:** `packages/frontend/dist`
- **Environment:** `VITE_API_URL=https://your-worker.workers.dev`

---

## Design Philosophy

EternalOS is intentionally minimal:

1. **No social features** — No likes, comments, followers, or feeds
2. **No metrics** — No view counts, no analytics for users
3. **Visitors, not users** — Public desktops are browsed anonymously
4. **Place, don't post** — Files exist in space, not time
5. **Quiet by design** — A sanctuary, not an attention marketplace

The aesthetic is pixel-perfect Mac OS 8:
- VT323 pixel font
- 1px black borders with inner bevels
- Gray (#C0C0C0) platinum background
- Striped title bars
- 32×32 pixel art icons

---

## Security

- **JWT auth** using Web Crypto API (HMAC-SHA256)
- **PBKDF2 password hashing** (Workers-native)
- **R2 access control** — files served only to owners or if marked public
- **Rate limiting** — Auth endpoints limited to 60 req/min
- **100MB storage quota** per user
- **CSS sandboxing** — Custom CSS scoped to user desktop only

---

## License

MIT

---

Built with care on Cloudflare. Inspired by classic Mac OS.
