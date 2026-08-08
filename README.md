# Sonargaon University — Department of Business Administration

Website for the Department of Business Administration, Faculty of Business,
Sonargaon University. Nearly all content is managed through a built-in admin
panel rather than hardcoded, so staff can update the site without a deploy.

Built with **Next.js 15 (App Router)**, **React 19**, **TypeScript**,
**Tailwind CSS v4**, **Prisma + PostgreSQL (Neon)**, **Better Auth**, and
**Cloudinary** for media.

## Project Structure

```
.
├── prisma/
│   ├── schema.prisma         # Data model (single source of truth)
│   └── migrations/           # Hand-written SQL, applied with `migrate deploy`
├── src/
│   ├── app/
│   │   ├── (public)/         # Public site — about, admission, programs, …
│   │   ├── admin/            # CMS: (authed) pages + login
│   │   ├── api/              # Route handlers (uploads, auth, reorder, …)
│   │   ├── layout.tsx        # Root layout
│   │   ├── sitemap.ts        # Generated from live DB rows
│   │   └── globals.css       # Tailwind theme (@theme) + base styles
│   ├── components/
│   │   ├── layout/           # Navbar, Footer, PageShell
│   │   ├── sections/         # Homepage sections
│   │   ├── admin/            # CMS widgets (uploaders, sortable editors)
│   │   └── ui/               # Reusable primitives
│   └── lib/
│       ├── db.ts             # Prisma client singleton
│       ├── identity.ts       # Cached read helpers for public pages
│       ├── admin-actions/    # Server Actions backing the CMS forms
│       ├── validation.ts     # Zod schemas shared by forms and actions
│       └── cloudinary.ts     # Signed-upload helpers + folder map
├── public/assets/            # Static images still served from the repo
└── next.config.ts
```

## Content Model

Content lives in Postgres and is edited at `/admin`. Two shapes recur:

- **Singletons** — one row per page (`id: "singleton"`), e.g. `AboutOverview`,
  `NewsletterPage`, `AboutDepartmentLayout`.
- **Collections** — ordered lists with drag-to-reorder `displayOrder`, e.g.
  `Program`, `Faculty`, `Event`, `News`, `Syllabus`, `Faq`.

Public pages read through `React.cache()` helpers in `src/lib/identity.ts`, so
a layout and its children share a single query per request. Admin writes go
through Server Actions in `src/lib/admin-actions/`, which validate with Zod and
then call `revalidatePath()` for the affected routes.

## Media

Images and PDFs upload straight from the browser to Cloudinary using a
short-lived signature minted server-side (`/api/admin/uploads/sign`), so the
API secret never reaches the client. Oversized photos are downscaled in the
browser first — see `src/lib/image-compress.ts`.

## Development

**Prerequisites:** Node.js 18.18+, and a `.env` with `DATABASE_URL`,
`DIRECT_URL`, `BETTER_AUTH_SECRET`, and the `CLOUDINARY_*` values.

```bash
npm install

# Dev server (http://localhost:3000)
npm run dev

# Apply migrations to the database in .env
npx prisma migrate deploy

# Production build (runs `prisma generate` first)
npm run build
npm start

# Type check
npm run typecheck

# Browse the database
npm run db:studio
```

> On Windows, stop the dev server before running Prisma commands — a running
> server holds a lock on the generated client and the command will fail with
> `EPERM`.

## Adding a Page

Create a folder under `src/app/(public)/`:

```
src/app/(public)/programs/page.tsx   →  /programs
```

Pages inherit the Navbar and Footer from the root layout. Wrap the body in
`PageShell` to get the standard hero, breadcrumb, and container. If the page
needs an editable hero, add a `PageHero` row keyed by `pageKey` and read it
with `getPageHero()` rather than hardcoding the image.
