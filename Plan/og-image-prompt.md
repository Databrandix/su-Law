# OG Image তৈরির প্রম্পট

সোশ্যাল শেয়ার কার্ড (Facebook, LinkedIn, X, WhatsApp) — Department of Law,
Sonargaon University।

**মাপ:** ঠিক **1200 × 630 px** (1.91:1)
**ফরম্যাট:** WebP বা PNG
**বসানোর জায়গা:** `/admin/department-identity` → Social share image (Open Graph)

---

## ব্র্যান্ড রং (প্রজেক্টের ডেটাবেস থেকে)

| ভূমিকা | HEX | ব্যবহার |
|---|---|---|
| Primary | `#2B3175` | গাঢ় ইন্ডিগো — পটভূমি, মূল রং |
| Accent | `#CC1579` | ম্যাজেন্টা — জোর দেওয়ার জন্য, লাইন |
| Button | `#F8BD23` | সোনালি হলুদ — ছোট হাইলাইট |

---

## প্রম্পট (ইংরেজিতে — AI ইমেজ টুলে দিন)

```
Create a professional social media share banner, exactly 1200x630 pixels,
for a university law department.

BRAND COLORS (use exactly these):
- Deep indigo background: #2B3175
- Magenta accent: #CC1579
- Golden yellow highlight: #F8BD23

LAYOUT:
- Left two-thirds: text block, left-aligned
    Small overline in golden yellow #F8BD23, uppercase, wide letter-spacing:
      "SONARGAON UNIVERSITY"
    Large bold headline in white, two lines:
      "Department of"
      "Law"
    Thin magenta #CC1579 horizontal rule below the headline
    One line of subtitle in soft white (75% opacity), smaller:
      "Faculty of Arts and Humanities"
- Right third: a single restrained legal motif — a balanced scale of
  justice OR a classical column, rendered as a subtle line-art or
  low-opacity silhouette in magenta and gold. Not a photograph.
- Background: deep indigo with a soft diagonal gradient toward near-black
  at the bottom-right; optional very faint geometric pattern at under 8%
  opacity.

STYLE:
- Clean, institutional, academic. Editorial poster feel.
- Modern geometric sans-serif typography (like Poppins or Montserrat).
- Generous margins: keep all text at least 60px from every edge.
- Flat vector aesthetic. No stock-photo people, no clip-art gavel,
  no cheesy 3D, no lens flare.
- High contrast so the text stays readable when the card is shown small
  in a chat preview.

DO NOT include: any university crest or logo (added separately),
watermarks, placeholder lorem text, or the words "Business" or "BBA".
```

---

## ছোট সংস্করণ (দ্রুত ব্যবহারের জন্য)

```
Professional 1200x630 social share banner for a university law department.
Deep indigo #2B3175 background with subtle diagonal gradient. Left side:
golden #F8BD23 uppercase overline "SONARGAON UNIVERSITY", large white bold
headline "Department of Law", thin magenta #CC1579 rule, small subtitle
"Faculty of Arts and Humanities". Right side: minimal line-art scales of
justice in magenta and gold at low opacity. Flat vector, geometric sans-serif
type, generous margins, high contrast, institutional and clean. No photos,
no people, no logo, no 3D.
```

---

## গুরুত্বপূর্ণ নির্দেশনা

**লেখা:** AI ইমেজ টুল প্রায়ই অক্ষর ভুল লেখে। দুটি উপায়:
1. প্রম্পটে লেখা চান, তারপর যাচাই করুন — বানান ঠিক আছে কিনা
2. অথবা শুধু পটভূমি ও মোটিফ তৈরি করুন, লেখা পরে Canva/Figma-তে বসান
   (এটিই নিরাপদ)

**লোগো:** প্রম্পটে লোগো চাইনি ইচ্ছাকৃতভাবে — AI বিশ্ববিদ্যালয়ের আসল
ক্রেস্ট আঁকতে পারবে না। ছবি তৈরির পর `public/assets/su-colour-logo.webp`
নিজে বসিয়ে নিন (সাধারণত উপরের-বাঁয়ে বা নিচের-ডানে)।

**যাচাই করুন:** ছোট আকারে (থাম্বনেইল) দেখে নিন লেখা পড়া যাচ্ছে কিনা —
চ্যাটে শেয়ার হলে কার্ড ছোট দেখায়।

---

## কোথায় বসাবেন

**উপায় ১ (সুপারিশ) — `/admin` থেকে:**
`/admin/department-identity` → "Social share image (Open Graph)" → আপলোড
ছবি যাবে Cloudinary-তে `law-dept/department/og/` ফোল্ডারে।

**উপায় ২ — ফাইল বদলে:**
`c:\Databrandix HQ\SU-Law\public\assets\og-banner.webp` — একই নামে নতুন ছবি রাখুন।

---

## ✅ সম্পন্ন

- নতুন OG ছবি বসানো হয়েছে: `public/assets/og-banner.webp` (1200×630, 40 KB)
- `SITE_URL` ঠিক করা হয়েছে: `https://su-law.vercel.app`
- `robots.ts` ও `sitemap.ts`-এর `BASE_URL`-ও একই ডোমেইনে হালনাগাদ
