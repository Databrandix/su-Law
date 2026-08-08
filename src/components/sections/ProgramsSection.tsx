'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import { Clock, CheckCircle2, ArrowRight, ChevronDown } from 'lucide-react';
import Container from '../ui/Container';

const DEFAULT_PROGRAM_IMAGE = '/assets/program-undergraduate.webp';
const DEFAULT_CTA_TEXT = 'View More';

type ProgramRow = {
  id: string;
  overline: string;
  programName: string;
  degreeCode: string;
  slug: string | null;
  duration: string;
  description: string;
  imageUrl: string | null;
  specializations: string[];
  cta: string | null;
  ctaHref: string | null;
};

// Last resort only — a program with neither a detail page nor an
// explicit ctaHref still needs somewhere useful to send the visitor.
const DEFAULT_CTA_HREF = '/admission/requirements';

// The program's own page wins; an explicit ctaHref can still override
// it (e.g. to point at an external brochure).
function ctaHrefFor(program: ProgramRow): string {
  if (program.ctaHref) return program.ctaHref;
  if (program.slug) return `/programs/${program.slug}`;
  return DEFAULT_CTA_HREF;
}


type ProgramsSectionProps = {
  programs: readonly ProgramRow[];
  /**
   * Renders the animated chevron that leads to the full listing.
   * On the homepage only one program per tier is passed, so the
   * chevron is how visitors reach the rest; /programs already shows
   * everything and passes false.
   */
  showAllLink?: boolean;
  allLinkHref?: string;
  /**
   * The "Programmes Offered" block. Off on /programs, where the page
   * hero already announces the section and repeating it reads as a
   * duplicate title.
   */
  showHeading?: boolean;
};

export default function ProgramsSection({
  programs,
  showAllLink = false,
  allLinkHref = '/programs',
  showHeading = true,
}: ProgramsSectionProps) {
  return (
    <section className="bg-[#F2F2F2] py-12 md:py-20">
      <Container>
        {showHeading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 md:mb-14"
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="w-10 h-[1.5px] bg-accent/40" />
              <span className="text-accent font-bold tracking-[0.2em] uppercase text-[10px]">
                Academic Programs
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary">
              Programmes Offered
            </h2>
            <div className="mt-3 mx-auto h-1 w-16 bg-accent rounded-full" />
          </motion.div>
        )}

        <div className="space-y-12 md:space-y-16">
          {programs.map((program, idx) => {
            const heading = program.programName;
            const imageSrc = program.imageUrl || DEFAULT_PROGRAM_IMAGE;
            const ctaText = program.cta || DEFAULT_CTA_TEXT;
            // Alternate sides: even rows put the image left, odd rows
            // flip it to the right. Mobile always stacks image-first.
            const imageRight = idx % 2 === 1;
            // The overline heads a tier, not a row — print it only when
            // the tier changes, so seven consecutive graduate degrees
            // sit under one "Graduate" heading instead of seven.
            const isTierStart =
              idx === 0 || programs[idx - 1].overline !== program.overline;

            return (
              <div
                key={program.id}
                // Extra breathing room where a new tier begins, since
                // its heading has to separate itself from the row above.
                className={isTierStart && idx > 0 ? 'pt-6 md:pt-10' : undefined}
              >
                {/* Overline sits above the whole row, so it stays on the
                    left even when the image flips to the right. */}
                {program.overline && isTierStart && (
                  <p className="mb-4 border-l-[3px] border-accent pl-3 text-2xl md:text-3xl lg:text-[34px] font-display font-bold text-primary">
                    {program.overline}
                  </p>
                )}
              <motion.article
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08, duration: 0.6 }}
                className="grid items-start gap-8 md:gap-12 lg:gap-16 lg:grid-cols-2"
              >
                {/* Image — alternates left / right */}
                <div className={imageRight ? 'order-1 lg:order-2' : 'order-1'}>
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl group h-[300px] md:h-[400px]">
                  <Image
                    src={imageSrc}
                    alt={program.programName}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent pointer-events-none" />
                  {program.duration && (
                    <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-sm px-4 py-1.5 text-[12px] font-bold text-primary shadow-md">
                      <Clock size={13} className="text-accent" />
                      {program.duration}
                    </span>
                  )}
                  </div>
                </div>

                {/* Content — alternates right / left */}
                <div className={imageRight ? 'order-2 lg:order-1' : 'order-2'}>
                  <h3 className="text-[22px] md:text-[26px] font-display font-bold text-primary leading-tight mb-4">
                    {heading}
                  </h3>

                  <p className="text-[15px] md:text-[16px] leading-[1.85] text-gray-700 mb-6">
                    {program.description}
                  </p>

                  {program.specializations && program.specializations.length > 0 && (
                    <div className="mb-7">
                      <p className="text-[12px] font-bold uppercase tracking-wider text-gray-500 mb-3">
                        Specializations
                      </p>
                      <ul className="grid sm:grid-cols-2 gap-2.5">
                        {program.specializations.map((spec) => (
                          <li
                            key={spec}
                            className="flex items-center gap-2.5 text-[14px] font-semibold text-primary"
                          >
                            <CheckCircle2 size={18} className="shrink-0 text-accent" />
                            {spec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <a
                    href={ctaHrefFor(program)}
                    className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent px-8 py-3 text-base font-bold text-white shadow-md transition-all hover:shadow-premium"
                  >
                    {ctaText}
                    <ArrowRight
                      size={18}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </a>
                </div>
              </motion.article>
              </div>
            );
          })}

        </div>

        {showAllLink && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-12 md:mt-16 flex flex-col items-center gap-3"
          >
            <a
              href={allLinkHref}
              aria-label="View all programs"
              className="group flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/15 bg-white text-primary shadow-md transition-all hover:border-accent hover:bg-accent hover:text-white hover:shadow-premium focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {/* The chevron drifts down and back on a loop — a standing
                  hint that there is more below, not a one-off entrance. */}
              <motion.span
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="flex"
              >
                <ChevronDown size={26} strokeWidth={2.5} />
              </motion.span>
            </a>
            <a
              href={allLinkHref}
              className="text-[13px] font-bold uppercase tracking-[0.15em] text-primary/70 transition-colors hover:text-accent"
            >
              View All Programs
            </a>
          </motion.div>
        )}
      </Container>
    </section>
  );
}
