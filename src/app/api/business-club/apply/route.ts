/**
 * Compatibility shim for the old apply endpoint.
 *
 * The route moved to /api/club-applications/apply when applications
 * stopped being Business-Club-only. A browser holding the previous
 * client bundle still POSTs here, and a 404 would look to the student
 * like the form is broken, so this forwards to the real handler rather
 * than failing. Safe to delete once no cached bundle can still be in
 * use — nothing in the current source references this path.
 */
export { POST } from '../../club-applications/apply/route';
