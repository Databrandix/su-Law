/**
 * Shape of the free-form detail sections on a faculty profile
 * (Academic Qualification, Publications, Awards, …).
 *
 * These are stored as Json on the Faculty model and edited through
 * SectionContentEditor, so both the public profile page and the admin
 * editor need the same type to agree on what a section may contain.
 */

/**
 * A single list entry. Either plain text, or text paired with an
 * optional link (used by Publication items — when `link` is present
 * the frontend renders the text as a clickable anchor).
 */
export type SectionItem = string | { text: string; link?: string };

/**
 * Flexible section content. A section can be:
 *  - a plain paragraph (string)
 *  - a simple bullet list (string[] or SectionItem[])
 *  - grouped lists with subheadings ({ heading, items }[])
 */
export type SectionContent =
  | string
  | SectionItem[]
  | { heading: string; items: SectionItem[] }[];
