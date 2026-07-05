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
imported JSON files (`output: 'export'` in `next.config.js`).

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
- **Student Portal / LMS**: add `app/portal/` behind auth middleware.
- **Payments (Stripe)**: wire `app/api/checkout/route.ts` once moving off static
  export, or use Stripe Checkout links from course cards.
- **Online Exams**: add `app/exams/[id]/page.tsx` with a form/quiz engine.
- **Multi-language (EN/BN/DE)**: introduce `next-intl` or `next-i18next`; copy
  currently lives in JSX/JSON so it's straightforward to extract into locale files.

## Notes

- The contact form currently simulates submission client-side. Wire it to a real
  backend (Formspree, Resend, a serverless function, etc.) before going live.
- Replace placeholder links (`forms.google.com/glab-*`, `facebook.com/glab.bd`,
  `chat.whatsapp.com/glab`) with your real URLs in the JSON data files.
