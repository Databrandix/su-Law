'use client';

import Image from 'next/image';
import {motion} from 'motion/react';
import Container from '../ui/Container';

type CtaProps = {
  label: string;
  href: string;
  isExternal: boolean;
};

type OverviewSectionProps = {
  heading: string;
  /** Pre-sanitized on the server — see the J1 author-trusted pattern. */
  bodyHtml: string;
  imageUrl: string;
  imageAlt: string;
  primaryCta: CtaProps;
  secondaryCta: CtaProps;
};

const CTA_CLASS =
  'rounded-full bg-gradient-to-r from-primary to-accent px-8 py-3 text-center text-base font-semibold text-white shadow-md transition-all hover:shadow-premium';

function Cta({ label, href, isExternal }: CtaProps) {
  return (
    <a
      href={href}
      className={CTA_CLASS}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {label}
    </a>
  );
}

export default function OverviewSection({
  heading,
  bodyHtml,
  imageUrl,
  imageAlt,
  primaryCta,
  secondaryCta,
}: OverviewSectionProps) {
  return (
    <section className="bg-white py-8 md:py-16">
      <Container className="!max-w-[1120px]">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6 md:mb-8 text-center text-2xl font-bold leading-tight text-primary md:text-[25px]"
        >
          {heading}
        </motion.h2>

        <div className="mx-auto grid max-w-[1090px] items-stretch gap-8 lg:gap-12 lg:grid-cols-[520px_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1 space-y-6"
          >
            <p
              className="text-justify text-[16px] font-medium leading-[1.75] tracking-[0.035em] text-black"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Cta {...primaryCta} />
              <Cta {...secondaryCta} />
            </div>
          </motion.div>

          {/* object-cover + a matching corner radius on the wrapper, so
              the photo fills the column and squares off level with the
              text beside it rather than floating at its own aspect
              ratio. The wrapper carries the radius because `absolute
              inset-0` on the image would otherwise overflow it. */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 overflow-hidden rounded-2xl lg:relative lg:order-2"
          >
            <Image
              src={imageUrl}
              alt={imageAlt}
              width={1264}
              height={843}
              sizes="(min-width: 1024px) 540px, 100vw"
              className="h-auto w-full object-cover lg:absolute lg:inset-0 lg:h-full lg:w-full"
            />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
