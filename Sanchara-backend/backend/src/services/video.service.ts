/**
 * Video service — the SINGLE place a stored video reference becomes a playable
 * URL. `Exercise.videoUrl` in the DB is a STORAGE KEY (a reference), never a
 * public URL. Every video URL returned anywhere in the session flow MUST pass
 * through `getPlayableVideoUrl` so entitlement is enforced in one place.
 */

const LOCAL_MEDIA_PREFIX = '/media';

/**
 * Resolve a storage key to a playable URL for an entitled requester.
 *
 * @returns the playable URL, or `null` when the requester is not entitled or
 *          there is no key (never leak a playable URL to a non-entitled request).
 */
export function getPlayableVideoUrl(storageKey: string, isEntitled: boolean): string | null {
  if (!isEntitled) return null;
  if (!storageKey) return null;

  // DEPLOY: replace with Bunny.net signed-URL generation (token auth + expiry).
  // Do not change callers.
  const normalizedKey = storageKey.replace(/^\/+/, '');
  return `${LOCAL_MEDIA_PREFIX}/${normalizedKey}`;
}
