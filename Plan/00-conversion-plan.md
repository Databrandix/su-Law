# BA → Law Conversion Plan

Converting the Sonargaon University **Department of Business Administration**
template into the **Department of Law**.

**Status:** Planning — nothing executed yet
**Last updated:** 2026-08-08

---

## Current state

| | |
|---|---|
| Local dev | Running on port 3000 |
| Database | Own Neon project (`ep-plain-union-azlgxcro`, Singapore) — full copy of original BA data |
| Vercel | Deployed, admin login working |
| Admin | `su.departmentoflaw@gmail.com` |
| Original BA database | Separate, untouched, still live |

The original database is **read-only history** at this point. Every change
below applies only to our copy. If anything goes wrong, the original is
still intact and can be re-copied.

---

## Decisions made

| Question | Decision |
|---|---|
| Programs | **LLB + LLM** — replaces all 8 business programs |
| Faculty | **User will provide the Law faculty list** — do not fabricate people |
| Business Club subsystem | **Deferred** — user will give direction later |

## Open questions (blocking their phases only)

1. **Law faculty list** — names, designations, qualifications, photos (blocks Phase 5)
2. **Business Club direction** — rename vs. content-only vs. drop (blocks Phase 7)
3. **Production domain** — the real Vercel/custom domain for SEO metadata (blocks Phase 2)
4. **Programme details** — LLB/LLM durations, credits, fee structure, specialisations (blocks Phase 4)

---

## Scope — measured, not estimated

### Code
- **95** occurrences of business terms across `.ts` / `.tsx` / `.json` / `.md`
- **29** files under `src/app/(public)/` export their own `metadata`
- **20** files reference the Business Club subsystem (incl. build artefacts)

### Database — 112 rows mention business terms

| Rows | Table | Notes |
|---|---|---|
| 20 | `galleryImage` | alt text only |
| 19 | `event` | BA-specific events |
| 11 | `researchPaper` | of 40 total |
| 11 | `faculty` | real BA people — replace with real Law people |
| 9 | `mainNavItem` | nav labels |
| 8 | `program` | → becomes 2 (LLB, LLM) |
| 8 | `syllabus` | per-programme |
| 5 | `news` | BA news items |
| 3 | `researchArea` | of 7 total |
| 3 | `pageHero` | hero copy |
| 2 | `notice`, `club` | |
| 1 each | 12 singletons | identity, about, home, contact, legal, newsletter… |

---

## Two corrections to the earlier survey

Worth recording, because they change the work:

1. **`src/lib/search-index.ts` is NOT 394 lines of static BA entries.**
   It is fully DB-driven (`Phase 7 — FINAL — 100% DB-driven`). Only **one**
   hardcoded line mentions business — the Business Club page entry at line 41.
   Once the DB content is converted, search follows automatically.

2. **`src/lib/data.ts` is nearly orphaned.**
   Its `programs` and `researchAreas` arrays are dead code — nothing imports
   them. Only `quickLinks` (QuickLinksSection) and `campusServices`
   (ServicesSection) are still used, and neither is BA-specific.

Both were overstated in my initial estimate. The real code work is
smaller than first indicated; the real content work is in the database.

---

## Phases

Ordered by dependency and risk. Each is independently shippable —
nothing here requires a big-bang cutover.

---

### Phase 1 — Safety net
**Risk: none · Blocks: nothing**

Before changing content, make rollback cheap.

- [ ] Add `scripts/backup-db.ts` — dumps current DB state to a timestamped JSON file in `Plan/backups/`
- [ ] Take a baseline backup of the pristine BA copy
- [ ] Document restore steps in `Plan/01-backup-restore.md`

**Why first:** every later phase overwrites content. One command to get back
to a known-good state removes the fear from everything downstream.

---

### Phase 2 — Identity & SEO
**Risk: low · Blocks: nothing · Needs: production domain**

The highest-impact, smallest-effort change. Affects browser tabs, search
results, and link previews.

**Code:**
- [ ] `src/app/layout.tsx:27-31` — `SITE_URL`, `SITE_NAME`, `SITE_DESCRIPTION`, title template (`%s — Sonargaon University BA`)
- [ ] `package.json:2` — `sonargaon-university-ba-department` → `sonargaon-university-law-department`
- [ ] `README.md` — retitle and update description
- [ ] Sweep the 29 per-page `metadata` exports for BA-specific copy

**Database (via `/admin` or script):**
- [ ] `DepartmentIdentity` — `name`, `breadcrumbLabel`, `programName`, `programShortForm` (`(BBA)` → `(LLB)`), `programSubtitle`

**Leave alone:** brand colours (`#2b3175` / `#cc1579` / `#f8bd23`) — these are
the university's palette, not the department's. Changing them was a mistake
made earlier and reverted.

**Verify:** page title in browser tab, OG preview, homepage hero.

---

### Phase 3 — Navigation & chrome
**Risk: low · Blocks: nothing**

- [ ] 9 `mainNavItem` rows with business labels
- [ ] `mainNavGroup` titles where BA-specific
- [ ] `footerUsefulLink` / `footerQuickLink` entries
- [ ] `quickAccessItem` labels

All editable through `/admin/nav` and `/admin/footer-links` — no code changes.
Nav item pointing at `/about/business-club` stays until Phase 7 decides its fate.

---

### Phase 4 — Programs
**Risk: medium · Blocks: syllabus, prospectus, fees · Needs: programme details**

The structural core. 8 business programmes → 2 law programmes.

- [ ] Author `LLB (Hons)` — 4 years, 8 semesters, specialisations, overview paragraphs
- [ ] Author `LLM` — duration, specialisations, overview paragraphs
- [ ] Create `ProgramFeeStructure` for each (credits, per-credit rates, shifts, policies)
- [ ] Delete the 8 BA programme rows **after** the new ones verify
- [ ] Update 8 `syllabus` rows → LLB/LLM
- [ ] Update `prospectusEntry`
- [ ] Update `AdmissionRequirements` — Bar Council academic requirements

**Care needed:** `Program.slug` addresses a route (`/programs/<slug>`) and
`degreeCode` is unique. `ProgramFeeStructure` cascades on programme delete —
create the new structures before removing old programmes, or fee data is lost.

---

### Phase 5 — People & scholarship
**Risk: medium · Blocked on: user-supplied faculty list**

- [ ] Import real Law faculty from the list you provide
- [ ] Set `isHead` / `isDean` flags
- [ ] Upload faculty photos to Cloudinary (`law-dept` folder)
- [ ] Remove the 11 BA faculty rows once Law faculty are in
- [ ] Review 40 `researchPaper` rows — 11 mention business terms
- [ ] Convert 3 business `researchArea` rows → law areas (Constitutional, Criminal, Corporate, International, Human Rights…)

**Explicitly not doing:** inventing faculty. The 11 current rows are real
people from the BA department. They get replaced with real Law people from
your list, or left in place until that list exists — never fabricated.

The 37 faculty photos in `public/assets/` belong to BA staff and should be
removed once Law photos are uploaded.

---

### Phase 6 — Page content
**Risk: low · Blocks: nothing**

Singletons and collections, all editable via `/admin`:

- [ ] `AboutOverview` — department history and description
- [ ] `AboutMissionVision` — mission and vision statements
- [ ] `HomeOverview` — homepage introduction
- [ ] `JourneyCTAContent` — call-to-action copy
- [ ] `ContactPageContent`, `NewsletterPage`, `LegalPagesContent`, `NewsLanding`
- [ ] 3 `pageHero` rows with BA copy
- [ ] 25 `faq` rows — review for BA-specific answers
- [ ] 5 `news`, 19 `event`, 2 `notice` — archive or replace
- [ ] 20 `galleryImage` alt texts
- [ ] 2 `club`, 4 `visitor`, `alumni`

**Decision needed:** BA news and events are historical records of a different
department. Recommend deleting rather than rewriting — a Law department
should not claim BA achievements.

---

### Phase 7 — Business Club subsystem
**Risk: high · Deferred pending your direction**

The only genuine refactor in this plan. 20 files:

```
prisma/schema.prisma                    AboutBusinessClub, BusinessClubApplication
src/app/(public)/about/business-club/   page.tsx, JoinBusinessClubButton.tsx
src/app/admin/(authed)/about-business-club/
src/app/admin/(authed)/business-club-applications/
src/app/api/admin/about-business-club/route.ts
src/app/api/business-club/apply/route.ts
src/lib/admin-actions/about-business-club.ts
src/lib/admin-actions/business-club-applications.ts
src/lib/identity.ts, validation.ts, search-index.ts:41
src/components/admin/Sidebar.tsx, src/app/sitemap.ts
```

Three options, your call:

| Option | Effort | Result |
|---|---|---|
| Full rename | High | Clean — DB tables, models, routes, files all renamed. Precedent exists: `20260802090000_rename_mecha_club_to_business_club` |
| Content-only | Low | Visitors see the new name; URL stays `/about/business-club`, internals stay `business_club` |
| Remove | Medium | Drop the subsystem entirely if the Law department has no equivalent club |

A full rename needs a new Prisma migration using `ALTER TABLE … RENAME`,
which preserves rows. The Mecha→Business migration is a working template.

---

### Phase 8 — Assets & cleanup
**Risk: low**

- [ ] Replace `/assets/og-banner.webp` (BA-branded social preview)
- [ ] Replace `/assets/overview-bba.webp`, `program-undergraduate.webp`
- [ ] Remove 37 BA faculty photos after Law photos are live
- [ ] Audit `public/assets/` for BA-specific imagery
- [ ] Delete dead code in `src/lib/data.ts` (`programs`, `researchAreas` — unused)
- [ ] `src/lib/search-index.ts:41` — Business Club entry (or Phase 7 handles it)

---

### Phase 9 — Verification
**Risk: none**

- [ ] Smoke test all 30 routes return 200
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] Grep for residual business terms
- [ ] Verify search returns law content
- [ ] Check `sitemap.xml` and `robots.txt`
- [ ] Confirm admin panel edits still save
- [ ] Deploy and verify production

---

## Suggested order

**Start:** Phase 1 (safety) → Phase 2 (identity/SEO — visible win, low risk)

Then Phases 3 and 6 in any order (both low-risk content work), Phase 4 when
programme details are available, Phase 5 when the faculty list arrives.

Phase 7 last — it is the only one that can break the build.

---

## Principles

1. **Nothing fabricated.** No invented faculty, programmes, or statistics.
   Placeholders are clearly marked as such.
2. **Backup before each destructive phase.**
3. **Content through `/admin` where possible** — it is the supported path
   and re-runnable; scripts only for bulk operations.
4. **One phase at a time**, verified before the next.
5. **The original BA database is never written to.**

---

## Files

```
Plan/
├── 00-conversion-plan.md   ← this file
├── 01-backup-restore.md    (Phase 1)
└── backups/                (Phase 1)
```
