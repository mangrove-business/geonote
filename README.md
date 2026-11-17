# GeoNote

A shared world map of post-it notes. Tap anywhere, leave a 280-character note, see everyone else's. No sign-up.

Static React + Vite + MapLibre app on **GitHub Pages**, with **Supabase** (Postgres/PostGIS/RLS/anonymous auth/Realtime) as the shared backend. Full design: see the MVP technical plan.

## Setup

### 1. Supabase
1. Create a free project at supabase.com.
2. SQL Editor → run `supabase/migrations/0001_init.sql` (RLS policies and triggers are the security model; don't trim them).
3. Authentication → Sign In / Providers → enable **Anonymous sign-ins**.
4. Project Settings → API → copy the Project URL and the **publishable/anon** key. Never use the `service_role`/secret key in this repo.
5. Verify (expect `[]`, then a 401/403):
   ```bash
   curl -s "$URL/rest/v1/rpc/notes_in_view" -H "apikey: $KEY" -H "Content-Type: application/json" \
     -d '{"min_lng":-35,"min_lat":-8.2,"max_lng":-34.7,"max_lat":-7.9,"view_zoom":15}'
   curl -i -X POST "$URL/rest/v1/notes" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
     -H "Content-Type: application/json" -d '{"body":"spam","lat":-8,"lng":-34.9}'
   ```

### 2. Local dev
```bash
cp .env.example .env.local   # fill in URL + publishable key
npm install
npm run dev                  # http://localhost:5173
npm test                     # unit tests (geo + time helpers)
npm run build && npm run preview   # test the production build before every deploy
```
Without env vars the app still runs as a read-only map ("no backend configured").

### 3. Deploy to GitHub Pages
1. Push to a public repo, branch `main`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Settings → Secrets and variables → Actions → **Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Push; `.github/workflows/deploy.yml` builds and publishes.
5. Optional: Supabase → Authentication → URL Configuration → Site URL = your Pages URL; custom domain via a `CNAME` file in `public/`.
6. Optional: `keep-alive.yml` pings Supabase so a free project doesn't pause after ~7 idle days.

Hosting notes: `base: './'` and hash routing (`#/n/<id>`) mean no server rewrites are needed. For social previews, make `og:image` / `twitter:image` in `index.html` absolute URLs once the final domain is known.

## Config
`src/lib/config.ts`: default map center (Recife), zoom limits, tile style URL, scopes, colors.

## Moderation
Run in the Supabase SQL editor (service role):
```sql
select n.id, n.status, n.body, n.scope, n.created_at, count(r.id) as report_count
from public.notes n left join public.note_reports r on r.note_id = n.id
group by n.id having count(r.id) > 0
order by report_count desc, n.created_at desc;
```
Restore: `update public.notes set status = 'visible' where id = '...';`. Remove an abusive user and their notes: delete the anonymous user under Authentication → Users (FK cascade). Notes auto-hide at 5 unique reports.
