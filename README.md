# Howly Public School — website & house system

The public school website (Home, About, Academics, Houses, Gallery, Notices, Admissions, Contact) and the
admin panel that edits it, plus the inter-house points system. Built with Vite (plain JavaScript),
a small API that runs as Vercel Functions, and MongoDB Atlas.

## Where things live

| Part | Files |
| --- | --- |
| Public pages | `index.html`, `about.html`, … (one per page) → `src/site/main.js` renders them |
| Page content (starting values) | `shared/site-defaults.js` — copied from the old hpsassam.org site |
| Animations & smooth scroll | `src/site/motion.js` (GSAP + Lenis) |
| Styles | `src/site/site.css` (website), `src/css/*` (admin & house leaderboard) |
| Admin panel | `admin.html`, `src/admin.js`, `src/js/site-editor.js`, `src/js/enquiries.js` |
| API | `api/rpc.js`, `api/media.js` → `server/*` |
| Images from the old site | `public/images/` |

Everything on the website can be changed from **Admin → Website**. Saved changes are stored in MongoDB
(collection `site_content`) and override the starting values. Uploaded pictures are resized in the
browser and stored in MongoDB (`media`). Admission and contact form messages land in **Admin → Enquiries**.

## Run it on your computer

```bash
npm install
npm run dev
```

The site opens at http://localhost:3000, the admin panel at http://localhost:3000/admin.html.
`.env.local` (not committed) holds the database connection — see `.env.example`.

On this computer only, the admin login page also offers **Set or reset admin password**.
You can also run `node scripts/set-admin-password.mjs`.

## Animations

Visitors whose device asks for reduced motion (for example Windows with *Animation effects* turned off)
get a calm version with gentle fades. Add `?motion=full` to any address to preview the full animations
in that browser tab, `?motion=calm` for the calm version, `?motion=auto` to go back to the device setting.

## Checks

```bash
npm run test:api
```

runs the API checks against the throwaway database `hps_test` (never the real `hps` data).

## Deploying on Vercel

Add these under Project Settings → Environment Variables, with the values from `.env.local`:
`MONGODB_URI`, `MONGODB_DB`, `AUTH_SECRET`. Then push to `main`.
