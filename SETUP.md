# EternalOS Setup Guide

Complete guide to set up EternalOS on Cloudflare's platform.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- Git

---

## 1. Clone & Install

```bash
git clone https://github.com/starlightglim/eternal.git
cd eternal

# Install all dependencies (monorepo)
npm install
```

---

## 2. Cloudflare CLI Setup

```bash
# Install Wrangler globally
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

This opens a browser to authenticate with your Cloudflare account.

---

## 3. Create Cloudflare Resources

Navigate to the worker package:

```bash
cd packages/worker
```

### 3.1 Create KV Namespaces

```bash
# Auth KV (stores users, sessions, usernames)
wrangler kv namespace create AUTH_KV
wrangler kv namespace create AUTH_KV --preview

# Desktop KV (caches public desktop snapshots for visitors)
wrangler kv namespace create DESKTOP_KV
wrangler kv namespace create DESKTOP_KV --preview
```

**Copy the output IDs** and update `packages/worker/wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "AUTH_KV"
id = "your-auth-kv-id-here"
preview_id = "your-auth-kv-preview-id-here"

[[kv_namespaces]]
binding = "DESKTOP_KV"
id = "your-desktop-kv-id-here"
preview_id = "your-desktop-kv-preview-id-here"
```

### 3.2 Create R2 Bucket

```bash
wrangler r2 bucket create eternalos-files
```

The bucket is already configured in `wrangler.toml`:
```toml
[[r2_buckets]]
binding = "ETERNALOS_FILES"
bucket_name = "eternalos-files"
```

### 3.3 Set JWT Secret (Production)

```bash
wrangler secret put JWT_SECRET
# Enter a strong random string (32+ characters)
# Example: openssl rand -hex 32
```

---

## 4. Local Development

### 4.1 Start the Worker (API)

```bash
cd packages/worker
npx wrangler dev
```

This starts the API at `http://localhost:8787` with:
- Simulated KV namespaces
- Simulated R2 bucket
- Simulated Durable Objects
- Workers AI (mocked locally)

### 4.2 Configure Frontend

```bash
cd packages/frontend

# Create local environment file
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_API_URL=http://localhost:8787
```

### 4.3 Start the Frontend

```bash
cd packages/frontend
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## 5. Deploy to Production

### 5.1 Deploy the Worker

```bash
cd packages/worker
npx wrangler deploy
```

Note your Worker URL: `https://eternalos-api.<your-subdomain>.workers.dev`

### 5.2 Deploy the Frontend (Cloudflare Pages)

**Option A: Via Dashboard**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
2. Click "Create a project" → "Connect to Git"
3. Select your repository
4. Configure build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `packages/frontend/dist`
   - **Root directory:** `/`
5. Add environment variable:
   - `VITE_API_URL` = `https://eternalos-api.<your-subdomain>.workers.dev`
6. Deploy

**Option B: Via CLI**

```bash
cd packages/frontend
npm run build
npx wrangler pages deploy dist --project-name=eternalos
```

### 5.3 Set Production Environment

In Cloudflare Pages dashboard → Settings → Environment variables:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://eternalos-api.<your-subdomain>.workers.dev` |

---

## 6. Custom Domain (Optional)

### For the Worker (API)

1. Dashboard → Workers → eternalos-api → Triggers
2. Add Custom Domain: `api.yourdomain.com`

### For Pages (Frontend)

1. Dashboard → Pages → eternalos → Custom domains
2. Add: `yourdomain.com` and `www.yourdomain.com`

Update frontend environment:
```
VITE_API_URL=https://api.yourdomain.com
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                         │
│                   (React Frontend)                          │
│                  yourdomain.com                             │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Cloudflare Worker                          │
│                 api.yourdomain.com                          │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Routes    │  │ Middleware  │  │   Durable Object    │ │
│  │             │  │             │  │                     │ │
│  │ /api/auth/* │  │ JWT verify  │  │   UserDesktop       │ │
│  │ /api/desktop│  │             │  │   (per-user state)  │ │
│  │ /api/upload │  └─────────────┘  └─────────────────────┘ │
│  │ /api/visit  │                                           │
│  │ /api/assist │                                           │
│  └─────────────┘                                           │
└───────┬─────────────────┬─────────────────┬────────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│      KV       │ │      R2       │ │  Workers AI   │
│               │ │               │ │               │
│ • Users       │ │ • Images      │ │ • Llama 3.3   │
│ • Sessions    │ │ • Text files  │ │ • Desk Assist │
│ • Usernames   │ │ • Uploads     │ │               │
│ • Public cache│ │               │ │               │
└───────────────┘ └───────────────┘ └───────────────┘
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | No | Create account |
| POST | `/api/auth/login` | No | Login, get JWT |
| POST | `/api/auth/logout` | Yes | Invalidate session |
| GET | `/api/desktop` | Yes | Get user's desktop items |
| POST | `/api/desktop/items` | Yes | Create item (folder, text, link) |
| PATCH | `/api/desktop/items` | Yes | Update items (positions, names) |
| DELETE | `/api/desktop/items/:id` | Yes | Delete item |
| POST | `/api/upload` | Yes | Upload file to R2 |
| GET | `/api/files/:uid/:id/:name` | Mixed | Get file (auth or public) |
| GET | `/api/visit/:username` | No | Get public desktop |
| POST | `/api/assistant` | Yes | Chat with Desk Assistant |

---

## Troubleshooting

### "KV namespace not found"
Run `wrangler kv:namespace create` and update the IDs in `wrangler.toml`

### "R2 bucket not found"
Run `wrangler r2 bucket create eternalos-files`

### CORS errors
The Worker includes CORS headers. Make sure `VITE_API_URL` matches exactly.

### "Unauthorized" on all requests
Check that:
1. JWT_SECRET is set: `wrangler secret list`
2. Frontend is sending the Authorization header

### Local dev not working
Make sure both are running:
- Worker: `cd packages/worker && npx wrangler dev` (port 8787)
- Frontend: `cd packages/frontend && npm run dev` (port 5173)

---

## Costs (Cloudflare Free Tier)

| Service | Free Tier | Limits |
|---------|-----------|--------|
| Workers | 100k requests/day | 10ms CPU per request |
| KV | 100k reads/day, 1k writes/day | 1GB storage |
| R2 | 10GB storage | 1M Class A, 10M Class B ops/month |
| Durable Objects | Included | 1M requests/month |
| Workers AI | Limited free tier | Varies by model |
| Pages | Unlimited sites | 500 builds/month |

For a personal project, you'll likely stay within free tier.

---

## Next Steps

1. Set up the resources (Section 3)
2. Test locally (Section 4)
3. Deploy (Section 5)
4. Optional: Add custom domain (Section 6)

Questions? Check the [Cloudflare Workers docs](https://developers.cloudflare.com/workers/) or open an issue.
