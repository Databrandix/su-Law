'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import ImageUploader from '@/components/admin/ImageUploader';
import HeroImagePositionSlider from '@/components/admin/HeroImagePositionSlider';

export type HeroSlide = {
  url: string;
  publicId: string;
  alt: string;
  verticalPercent: number;
};

/**
 * The three homepage hero slides live in flat, positional columns
 * (heroImage1Url, heroImage2Url, …), so there is no displayOrder to
 * sort by. Reordering therefore means swapping whole slides between
 * positions — which is what the arrow buttons do here, in local state,
 * before the form posts the usual heroImageN* field names.
 */
export default function HeroImagesEditor({ initial }: { initial: HeroSlide[] }) {
  const [slides, setSlides] = useState<HeroSlide[]>(initial);
  // Bumped on every swap so the uploader and slider remount with the
  // values of whichever slide now occupies that position — both keep
  // their own internal state seeded from props.
  const [revision, setRevision] = useState(0);

  function swap(a: number, b: number) {
    setSlides((prev) => {
      const next = [...prev];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
    setRevision((r) => r + 1);
  }

  function update(index: number, patch: Partial<HeroSlide>) {
    setSlides((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Hero #1 is the first slide visitors see. Use the arrows to change
        the order — the image, alt text, and position move together. Alt
        text describes each image for screen readers; update it when you
        replace an image.
      </p>

      {slides.map((slide, i) => {
        const position = i + 1;
        return (
          <div
            key={`slot-${i}-${revision}`}
            className="space-y-3 rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-gray-700">
                Hero #{position}
                {i === 0 && (
                  <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                    First slide
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => swap(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Move hero ${position} up`}
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => swap(i, i + 1)}
                  disabled={i === slides.length - 1}
                  aria-label={`Move hero ${position} down`}
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <ArrowDown size={16} />
                </button>
              </div>
            </div>

            {/* Passing onChange makes ImageUploader defer the hidden
                inputs to us, so the posted value always matches the
                slide currently sitting in this position. */}
            <ImageUploader
              kind="department-hero"
              name={`heroImage${position}`}
              aspectRatio="wide"
              initialUrl={slide.url}
              initialPublicId={slide.publicId}
              onChange={(url, publicId) => update(i, { url, publicId })}
            />
            <input type="hidden" name={`heroImage${position}Url`} value={slide.url} />
            <input type="hidden" name={`heroImage${position}PublicId`} value={slide.publicId} />

            <div>
              <label
                htmlFor={`heroImage${position}Alt`}
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Alt text
              </label>
              <input
                id={`heroImage${position}Alt`}
                name={`heroImage${position}Alt`}
                type="text"
                value={slide.alt}
                onChange={(e) => update(i, { alt: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            <HeroImagePositionSlider
              name={`heroImage${position}VerticalPercent`}
              initialValue={slide.verticalPercent}
              label="Vertical position"
              onChange={(verticalPercent) => update(i, { verticalPercent })}
            />
          </div>
        );
      })}
    </div>
  );
}
