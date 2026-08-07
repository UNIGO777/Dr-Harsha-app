/**
 * Media URL resolution.
 *
 * The backend stores a STORAGE KEY (`uploads/thumbnails/<uuid>.png`), not a URL,
 * and exposes the resolved value on a separate field — `thumbnailImageUrl` for
 * covers, `videoUrl`/`playbackUrl` for video. Those resolved values are
 * SERVER-RELATIVE (`/media/uploads/...`), which is fine for the admin web app
 * behind a Vite proxy but useless to a native <Image>: expo-image has no origin
 * to resolve against, so it silently renders nothing.
 *
 * So everything the app displays goes through `resolveMediaUrl`, which makes the
 * path absolute against the API host. Absolute URLs (the demo seed uses remote
 * Unsplash images) pass through untouched.
 */

/**
 * API origin without the trailing `/api` — EXPO_PUBLIC_API_URL points at the API
 * root, but `/media` is mounted at the SERVER root, one level up.
 */
const apiOrigin = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/api\/?$/, '').replace(/\/+$/, '');

/**
 * Turn any backend media reference into something a native <Image>/<Video> can
 * load. Returns undefined for empty input so callers can keep using a simple
 * `url ? <Image/> : <Fallback/>` check.
 */
export function resolveMediaUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  // Already absolute (remote CDN, or Bunny.net once that seam is live).
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  if (!apiOrigin) {
    if (__DEV__) {
      console.warn(`[media] EXPO_PUBLIC_API_URL is not set — cannot resolve "${trimmed}".`);
    }
    return undefined;
  }

  return `${apiOrigin}/${trimmed.replace(/^\/+/, '')}`;
}

/**
 * Cover image for a program/day DTO.
 *
 * Prefers the server-resolved `thumbnailImageUrl`; falls back to the raw
 * `thumbnailUrl`, which is only loadable when the seed happened to store an
 * absolute URL rather than a storage key.
 */
export function resolveThumbnail(dto: {
  thumbnailImageUrl?: string | null;
  thumbnailUrl?: string | null;
}): string | undefined {
  return resolveMediaUrl(dto.thumbnailImageUrl ?? dto.thumbnailUrl);
}
