/**
 * Public-facing identity: show anonymous_handle only — never username or display_name in UI.
 */

/** Label shown next to posts/comments (e.g. "CalmOtter42" or "Member" if missing). */
export function publicAuthorLabel(
  anonymousHandle: string | null | undefined,
): string {
  const t = anonymousHandle?.trim();
  return t ? t : "Member";
}

/**
 * Profile URL segment for /u/[handle]: prefer anonymous handle; fall back to legacy username
 * for routing only (still resolves on the profile page).
 */
export function publicProfileSegment(
  anonymousHandle: string | null | undefined,
  legacyUsername: string,
): string {
  const t = anonymousHandle?.trim();
  return t || legacyUsername;
}
