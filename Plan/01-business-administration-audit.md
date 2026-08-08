# "Business Administration" কোথায় কোথায় আছে — সম্পূর্ণ অডিট

**তারিখ:** ২০২৬-০৮-০৮
**অবস্থা:** শুধু খোঁজা হয়েছে — কিছুই পরিবর্তন করা হয়নি

খোঁজার শব্দগুলো: `Business Administration`, `BBA`, `MBA`, `EMBA`, `MBM`,
`Faculty of Business`, `Business Club`, `bba-dept`

---

## সারসংক্ষেপ

| স্তর | পরিমাণ | কোথায় ঠিক করা যায় |
|---|---|---|
| **ডেটাবেস** | **৮৬ সারি**, ১৯ টেবিলে | `/admin` থেকে |
| **কোড — SEO metadata** | ২৯ ফাইল | কোড এডিট |
| **কোড — দৃশ্যমান লেখা** | ৪ জায়গা | কোড এডিট |
| **কোড — Business Club সাবসিস্টেম** | ১৭ ফাইল | রিফ্যাক্টর (Phase 7) |
| **কোড — admin placeholder** | ৪০ জায়গা | কোড এডিট (কম গুরুত্ব) |
| **Cloudinary ফোল্ডার** | সব ছবির URL-এ `bba-dept/` | নতুন করে আপলোড |

---

## ১. ডেটাবেস — ৮৬ সারি

| টেবিল | মোট সারি | পরিবর্তন দরকার |
|---|---|---|
| GalleryImage | 21 | **20** |
| Event | 19 | **19** |
| MainNavItem | 28 | **9** |
| Program | 8 | **8** |
| Syllabus | 8 | **8** |
| News | 5 | **5** |
| PageHero | 18 | **3** |
| ResearchPaper | 40 | **2** |
| Notice | 6 | **2** |
| DepartmentIdentity | 1 | **1** |
| ResearchArea | 7 | **1** |
| AboutOverview | 1 | **1** |
| AboutDepartmentLayout | 1 | **1** |
| AboutBusinessClub | 1 | **1** |
| HomeOverview | 1 | **1** |
| NewsLanding | 1 | **1** |
| Club | 13 | **1** |
| ProspectusEntry | 1 | **1** |
| NewsletterPage | 1 | **1** |

### সম্পূর্ণ পরিষ্কার টেবিল (২৫টি)

এগুলোতে কিছু করার নেই:

UniversityIdentity, ProgramFeeStructure, **Faculty**, MainNavGroup,
QuickAccessItem, TopLink, FooterUsefulLink, FooterQuickLink,
FooterGetInTouchLink, FooterCampusLink, AboutMissionVision,
JourneyCTAContent, Faq, Visitor, BusRoute, TransportLanding,
AdmissionNotice, AdmissionRequirements, AdmissionTransferCredits,
WaiverScholarshipLanding, WaiverCategory, Scholarship,
ContactPageContent, CampusLocation, LegalPagesContent

> `Faculty` পরিষ্কার — ৭ জন আইন বিভাগের শিক্ষক ইতিমধ্যে বসানো হয়েছে।
> `DepartmentIdentity`-তে ১টি বাকি: `programSubtitle` এখনও পুরনো লেখা বহন করছে না,
> তবে অন্য কোনো ফিল্ডে `bba-dept` লোগো/ছবির URL আছে।

### গুরুত্বপূর্ণ পর্যবেক্ষণ

**Event (১৯টি) আর GalleryImage (২০টি)** — এগুলো BA বিভাগের **প্রকৃত ঐতিহাসিক ঘটনা**:
"BBA 19th Batch Farewell", "Business Adda 2024", "Business Club Formation Day",
"Champions of SU Inter-Department T-10 Cricket"।

এগুলো আইন বিভাগের ঘটনা নয়। **পরামর্শ: মুছে ফেলা, নতুন করে লেখা নয়** — কারণ
আইন বিভাগ BA বিভাগের অর্জন দাবি করতে পারে না।

**সব ছবির URL-এ `bba-dept/`** আছে (Cloudinary ফোল্ডার)। ছবিগুলো এখনও কাজ করবে,
কিন্তু নতুন আপলোড `law-dept/`-এ যাবে (`.env` অনুযায়ী)।

---

## ২. কোড — SEO metadata (২৯ ফাইল)

`src/app/(public)/`-এর প্রায় প্রতিটি পেজে `export const metadata` আছে যেখানে
"Department of Business Administration" লেখা। ব্রাউজার ট্যাব, Google ফলাফল,
আর লিংক শেয়ারে দেখায়।

উদাহরণ:

```
about/overview/page.tsx:9          'Overview of the Department of Business Administration…'
about/mission-vision/page.tsx:9    'The mission and vision of the Department of Business Administration…'
about/message-from-head/page.tsx   'Welcome message from the Head of the Department of Business Administration…'
about/department-layout/page.tsx   'Layout of the Department of Business Administration…'
faculty-member/page.tsx:11         'Faculty members of the Department of Business Administration…'
programs/page.tsx:8                '…BBA, MBA, EMBA, MBM, and specialised master's degrees.'
research/page.tsx:8,10             'Research — Department of Business Administration'
gallery/page.tsx:9                 'Campus life moments from the Department of Business Administration…'
news/page.tsx:12                   'Latest news from the Department of Business Administration…'
newsletter/page.tsx:11             'Subscribe to the Department of Business Administration newsletter…'
privacy-policy/page.tsx:9          'Privacy Policy for the Department of Business Administration…'
terms-and-conditions/page.tsx:9    'Terms & Conditions for the Department of Business Administration…'
admission/tuition-fees/page.tsx    'Tuition fee structures … Department of Business Administration.'
admission/prospectus/page.tsx      …
student-society/*/page.tsx         (alumni, visitor, syllabus, events, notice-board, faq)
```

---

## ৩. কোড — দৃশ্যমান লেখা (৪ জায়গা)

সরাসরি ব্যবহারকারী দেখে:

| ফাইল | লাইন | লেখা |
|---|---|---|
| `(public)/research/page.tsx` | 32 | "Department of Business Administration, Sonargaon University, spanning…" |
| `(public)/student-society/syllabus/page.tsx` | 30 | "Course-by-course syllabus for the Department of Business Administration…" |
| `(public)/student-society/events/[slug]/page.tsx` | 135 | `DetailRow label="Department" value="Business Administration"` |
| `(public)/admission/prospectus/ProspectusClient.tsx` | 94 | "Postgraduate programs in Business Administration are not offered yet…" |

---

## ৪. কোড — Business Club সাবসিস্টেম (১৭ ফাইল)

সবচেয়ে বড় কাঠামোগত কাজ। DB টেবিল, রুট, ফাইলের নাম — সব `business_club`:

```
prisma/schema.prisma                          AboutBusinessClub, BusinessClubApplication
src/app/(public)/about/business-club/         page.tsx, JoinBusinessClubButton.tsx
src/app/admin/(authed)/about-business-club/   page.tsx, AboutBusinessClubForm.tsx
src/app/admin/(authed)/business-club-applications/  page.tsx, ApplicationsList.tsx
src/app/api/admin/about-business-club/route.ts
src/app/api/business-club/apply/route.ts
src/lib/admin-actions/about-business-club.ts
src/lib/admin-actions/business-club-applications.ts
src/lib/identity.ts          getAboutBusinessClub()
src/lib/validation.ts        businessClubApplicationSchema
src/lib/search-index.ts:41   'Business Club' এন্ট্রি
src/components/admin/Sidebar.tsx
src/app/sitemap.ts
```

পাবলিক রুট: `/about/business-club`

> **নজির আছে:** `20260802090000_rename_mecha_club_to_business_club` মাইগ্রেশনে
> আগে একবার Mecha Club → Business Club নাম বদলানো হয়েছিল। একই পদ্ধতিতে
> `ALTER TABLE … RENAME` দিয়ে সারি না হারিয়ে নাম বদলানো যাবে।

**এটি আপনার সিদ্ধান্তের অপেক্ষায় (Phase 7)।**

---

## ৫. কোড — admin ফর্মের placeholder (৪০ জায়গা)

শুধু ফর্মে ধূসর উদাহরণ লেখা, প্রকৃত ডেটা নয়। কম গুরুত্বপূর্ণ:

```
admin/programs/ProgramForm.tsx:48,66              placeholder="bba", "/programs/bba"
admin/home-overview/HomeOverviewForm.tsx:30,33,52 "Business Administration (BA)" …
admin/alumni/AlumniForm.tsx:37                    defaultValue "Business Administration"
admin/prospectus-entries/ProspectusForm.tsx:41    "bba-business-administration"
admin/about-department-layout/…Form.tsx:76        "BBA Department Layout"
admin/faculty/DesignationSelector.tsx:46          কমেন্টে উদাহরণ
admin/syllabus/SyllabusForm.tsx                   …
```

---

## ৬. ইতিমধ্যে ঠিক করা হয়েছে

| জায়গা | অবস্থা |
|---|---|
| `Faculty` টেবিল | ✅ ৭ জন আইন শিক্ষক বসানো |
| `DepartmentIdentity.name` → "Department of Law" | ✅ |
| `breadcrumbLabel` → "Law", `programShortForm` → "LLB" | ✅ |
| `layout.tsx` — SITE_NAME, og:image:alt, title template | ✅ |
| `HeroSection.tsx` — FALLBACK_ALTS | ✅ |
| `faculty-member/[slug]/page.tsx:206` — Faculty of Arts and Humanities | ✅ |
| `events/[slug]/page.tsx:157` — Faculty সারি | ✅ |
| `README.md` | ✅ |

---

## ৭. যা এখনও বাকি এবং সিদ্ধান্ত দরকার

| বিষয় | কী দরকার |
|---|---|
| `layout.tsx` SITE_URL | আপনার **আসল Vercel ডোমেইন** — এখনও `su-business-administration.vercel.app` |
| Program (৮টি) | LLB/LLM-এর মেয়াদ, ক্রেডিট, বিশেষায়ন, ফি |
| Event (১৯) + GalleryImage (২০) | মুছে ফেলা হবে না রেখে দেওয়া হবে? |
| Business Club | নাম বদলানো / শুধু লেখা বদলানো / বাদ দেওয়া |
| `package.json` name | `sonargaon-university-ba-department` |

---

## পরামর্শ — কোন ক্রমে করা উচিত

1. **`layout.tsx` SITE_URL** — ডোমেইন পেলেই, SEO-র জন্য জরুরি
2. **২৯টি metadata** — একসাথে খুঁজে-বদলে করা যায়, ঝুঁকি নেই
3. **৪টি দৃশ্যমান লেখা** — ব্যবহারকারী সরাসরি দেখে
4. **Program (৮ → ২)** — তথ্য পেলে
5. **Event + Gallery** — সিদ্ধান্ত নিয়ে
6. **Business Club** — সবশেষে, কারণ এটিই একমাত্র বিল্ড ভাঙতে পারে
