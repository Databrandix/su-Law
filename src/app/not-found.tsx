import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import NotFoundContent from '@/components/sections/NotFoundContent';
import {
  getDepartmentIdentity,
  getUniversityIdentity,
  getTopLinks,
  getQuickAccessItems,
  getMainNav,
  getFooterUsefulLinks,
  getFooterGetInTouchLinks,
  getFooterQuickLinks,
  getFooterLegalLinks,
  getFooterCampusLinks,
} from '@/lib/identity';
import { getSearchIndex } from '@/lib/search-index';

export const metadata = {
  title: 'Page Not Found',
  description:
    "The page you're looking for doesn't exist on the Department of Law website.",
};

// Next resolves an unmatched URL here, at the app root — outside the
// (public) route group — so this file gets the root layout only. That
// is why the 404 used to render as a bare island: no navbar, no footer,
// no way to navigate anywhere except the two buttons on it.
//
// The chrome is therefore mounted explicitly below rather than by
// routing. The tempting alternative — a (public)/[...notFound]
// catch-all so the group layout applies — was tried and rejected: it
// turns the response into a 200, because notFound() raised from a page
// under that layout's `revalidate = 3600` is served from the static
// cache. Answering 200 for a missing page invites search engines to
// index every broken URL, so the real status is worth the duplicated
// getter list. All of these are React.cache-wrapped, and the root
// layout already calls getDepartmentIdentity, so this costs one batch.
export default async function NotFound() {
  const [
    dept,
    uni,
    topLinks,
    quickAccessItems,
    mainNav,
    usefulLinks,
    getInTouchLinks,
    quickLinks,
    legalLinks,
    campusLinks,
    searchItems,
  ] = await Promise.all([
    getDepartmentIdentity(),
    getUniversityIdentity(),
    getTopLinks(),
    getQuickAccessItems(),
    getMainNav(),
    getFooterUsefulLinks(),
    getFooterGetInTouchLinks(),
    getFooterQuickLinks(),
    getFooterLegalLinks(),
    getFooterCampusLinks(),
    getSearchIndex(),
  ]);

  return (
    <>
      <Navbar
        logoUrl={dept.logoUrl}
        applyUrl={uni.applyUrl ?? ''}
        topLinks={topLinks}
        quickAccessItems={quickAccessItems}
        mainNav={mainNav}
        searchItems={searchItems}
        topBarSocials={{
          facebookUrl: uni.facebookUrl,
          linkedinUrl: uni.linkedinUrl,
          youtubeUrl:  uni.youtubeUrl,
        }}
      />

      {/* flex-grow so the footer is pushed to the bottom of the viewport
          on tall screens, matching the public layout's <main>. */}
      <main className="flex-grow">
        {/* Top padding clears the fixed navbar, same as public pages. */}
        <NotFoundContent className="pt-[180px] md:pt-[200px] pb-20" />
      </main>

      <Footer
        logoUrl={uni.logoUrl}
        address={uni.address}
        phones={uni.phones}
        emails={uni.emails}
        copyrightText={uni.copyrightText}
        socials={{
          facebookUrl:  uni.facebookUrl,
          instagramUrl: uni.instagramUrl,
          linkedinUrl:  uni.linkedinUrl,
          youtubeUrl:   uni.youtubeUrl,
          xUrl:         uni.xUrl,
          threadsUrl:   uni.threadsUrl,
          tiktokUrl:    uni.tiktokUrl,
          whatsappUrl:  uni.whatsappUrl,
        }}
        usefulLinks={usefulLinks}
        getInTouchLinks={getInTouchLinks}
        quickLinks={quickLinks}
        legalLinks={legalLinks}
        campusLinks={campusLinks}
      />
    </>
  );
}
