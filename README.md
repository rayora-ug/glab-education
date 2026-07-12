# GLAB — German Language Academy of Bangladesh

A modern, mobile-first Next.js + Tailwind CSS website for GLAB, built with a clean
European-education aesthetic and a German-flag-inspired color system (black, red, gold).

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  layout.tsx              Root layout (server) — global metadata, fonts, theme
  page.tsx                 Home (server wrapper) -> home-client.tsx
  home-client.tsx          Home page UI (client component)
  globals.css               Design tokens, utility classes
  sitemap.ts / robots.ts    SEO
  courses/                  /courses
  registration/             /registration  (countdown timer / open state)
  announcements/            /announcements (search, filter, pagination)
  reviews/                  /reviews
  about/                    /about
  hellodeutsch/             /hellodeutsch
  contact/                  /contact (form)
  portal/                   /portal (existing-student registration by GLAB ID)
  api/portal/                lookup + submit routes (proxy to Google Apps Script)
components/
  NavFooter.tsx             Shared navbar + footer (client, dark mode, mobile menu)
data/
  announcements.json
  courses.json
  registration.json
  reviews.json
  faq.json
```

## Content Management (No Database Required)

All editable content lives in `/data/*.json`. To update the site:

- **Courses** → edit `data/courses.json`. Each course has `registrationOpen` and
  `googleFormLink` fields — toggle these to control the per-course CTA.
- **Announcements** → edit `data/announcements.json`. Add a new object to the array;
  it will automatically appear (paginated, searchable, filterable).
- **Registration status** → edit `data/registration.json`. Set `registrationOpen: true`
  to show the registration CTA + Google Form link, or `false` to show the live
  countdown timer to `nextRegistrationDate` (ISO 8601 string).
- **Reviews** → edit `data/reviews.json`. `averageRating` and `totalReviews` drive the
  summary card; `featured: true` reviews appear in the homepage carousel and the
  Reviews page spotlight section.
- **FAQ** → edit `data/faq.json`.

No redeploy logic is required beyond a standard rebuild, since these are statically
imported JSON files.

## Student Portal (`/portal`)

Lets an **existing** GLAB student (already assigned a GLAB ID) register for their
next course without filling out a new intake form. Foundation+A1 registration for
new/first-time applicants is handled entirely by a separate Google Form outside this
website — `/portal` is only for A2/B1 registration by returning students.

- Student enters their GLAB ID → verified against GLAB's roster spreadsheet.
- On success, they pick a specific **batch** (from each `registrationOpen` course's
  `batches` array in `data/courses.json` — A2 and B1 each currently run two batches
  with different days/times/start dates), choose a payment method, and upload payment
  proof (image/PDF, max 3MB).
- Data is stored in a Google Sheet + Drive folder GLAB already owns — no separate
  database. See [`apps-script/README.md`](apps-script/README.md) for the one-time
  Google-side setup (paste-in script, deploy as Web App).
- `app/api/portal/lookup` and `app/api/portal/submit` are server-side Route Handlers
  that proxy to that Apps Script Web App, keeping its URL and shared secret out of
  the client bundle. Requires these env vars (see `.env.local.example`):
  - `GLAB_SCRIPT_URL` — the Apps Script Web App URL
  - `GLAB_SCRIPT_TOKEN` — the shared secret configured in the Apps Script's project properties

This is why the site is no longer a pure static export (`output: 'export'` was
removed from `next.config.js`) — Route Handlers need a server runtime, which
`netlify.toml`'s `@netlify/plugin-nextjs` already provides via Netlify Functions.

### Lockdown mode (registration-only site)

Most of the site (Courses, Reviews, About, Announcements, HelloDeutsch, Verify, the
old `/registration` page) still holds placeholder content that shouldn't be shown to
students during the A2/B1 registration window. Set the env var
`NEXT_PUBLIC_LOCKDOWN_MODE=true` (in Netlify's environment variables, or `.env.local`
for local dev) to redirect every route except `/portal` and `/api/portal/*` to
`/portal/`, and switch the navbar/footer to a trimmed version (logo only + the real
Facebook/WhatsApp links). See `middleware.ts` for the redirect logic.

This is purely a runtime toggle — no pages or code are deleted. Once the registration
window closes, remove the env var (or set it to anything other than `"true"`) and
redeploy to instantly restore the full site.

## Design System

- **Colors**: `#000000` (black), `#DD0000` (red), `#FFCE00` (gold), warm off-white
  background (`#FEFDF9`), full dark mode via the `.dark` class on `<html>`.
- **Typography**: Playfair Display (headings) + DM Sans (body) + JetBrains Mono
  (labels/countdown) — loaded via Google Fonts in `app/layout.tsx`.
- **Utility classes**: see `app/globals.css` for `.btn-primary`, `.btn-secondary`,
  `.btn-gold`, `.card`, `.badge`, `.section-label`, `.input`, `.german-stripe`, etc.

## SEO

- Per-route `metadata` exports (title template, description, Open Graph) in each
  route's `page.tsx` server wrapper.
- `app/sitemap.ts` and `app/robots.ts` generate `/sitemap.xml` and `/robots.txt`
  automatically at build time.
- Static export (`output: 'export'`) for fast, CDN-friendly hosting.

## Future Expansion (already structured for)

- **Blog**: add `app/blog/[slug]/page.tsx` + a `data/posts/` folder or headless CMS.
- **Student login**: `/portal` currently identifies students by typed GLAB ID with
  no auth. A follow-up phase could add email/WhatsApp-based login so students don't
  need to type it, and unlock viewing attendance/homework/payment history — but that's
  real auth work, deliberately deferred out of the v1 registration flow.
- **Payments (Stripe)**: wire `app/api/checkout/route.ts` to accept real online
  payments, or use Stripe Checkout links from course cards — `/portal` currently only
  collects manually-uploaded proof of an off-platform payment (bKash/Nagad/bank).
- **Online Exams**: add `app/exams/[id]/page.tsx` with a form/quiz engine.
- **Multi-language (EN/BN/DE)**: introduce `next-intl` or `next-i18next`; copy
  currently lives in JSX/JSON so it's straightforward to extract into locale files.

## Notes

- The contact form currently simulates submission client-side. Wire it to a real
  backend (Formspree, Resend, a serverless function, etc.) before going live.
- Replace placeholder links (`forms.google.com/glab-*`, `facebook.com/glab.bd`,
  `chat.whatsapp.com/glab`) with your real URLs in the JSON data files.
